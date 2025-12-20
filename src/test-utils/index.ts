import { AnyAction, applyMiddleware, combineReducers, createStore, Reducer, Store } from 'redux';
import createSagaMiddleware, { Saga } from 'redux-saga';

import { asyncOperationsReducer, useOperation } from '../index';
import { State } from '../reducer';

type Runner<S = any> = {
    run: (saga: Saga<[store: Store<S, AnyAction>]>) => Promise<{ result: any; state: S }>;
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
        run: (saga: Saga<[store?: any]>) =>
            sagaMiddleware
                .run(saga, store)
                .toPromise()
                .then(result => ({ result, state: store.getState() })),
        store,
    };
}
