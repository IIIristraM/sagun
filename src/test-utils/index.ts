import { AnyAction, applyMiddleware, combineReducers, createStore, Reducer, Store } from 'redux';
import createSagaMiddleware, { Saga } from 'redux-saga';
import { call } from 'typed-redux-saga';

import { asyncOperationsReducer, ComponentLifecycleService, OperationService, useOperation } from '../index';
import { State } from '../reducer';

type Runner<S = any> = {
    run: (
        saga: Saga<
            [
                {
                    store: Store<S, AnyAction>;
                    operationService: OperationService;
                    componentLifecycleService: ComponentLifecycleService;
                },
            ]
        >
    ) => Promise<{ result: any; state: S }>;
    store: Store<S, AnyAction>;
};

function createDefaultReducer() {
    useOperation.setPath(state => state.asyncOperations);

    return combineReducers({
        asyncOperations: asyncOperationsReducer,
    });
}

export function getSagaRunner(): Runner<{ asyncOperations: State }>;
export function getSagaRunner<T extends Reducer<any, AnyAction>>(reducer: T): Runner<ReturnType<T>>;
export function getSagaRunner<T extends Reducer<any, AnyAction>>(reducer?: T) {
    const sagaMiddleware = createSagaMiddleware();
    const store = applyMiddleware(sagaMiddleware)(createStore)(reducer || createDefaultReducer());

    return {
        run: (saga: Saga<[{ store?: any }]>) =>
            sagaMiddleware
                .run(function* () {
                    const operationService = new OperationService({ hash: {} });
                    const componentLifecycleService = new ComponentLifecycleService(operationService);

                    yield* call(operationService.run);
                    yield* call(componentLifecycleService.run);

                    const result: any = yield* call(saga, { store, operationService, componentLifecycleService });

                    yield* call(operationService.destroy);
                    yield* call(componentLifecycleService.destroy);

                    return result;
                })
                .toPromise()
                .then(result => ({ result, state: store.getState() })),
        store,
    };
}
