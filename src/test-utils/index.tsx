import { Action, applyMiddleware, combineReducers, createStore, Reducer, Store } from 'redux';
import createSagaMiddleware, { Saga } from 'redux-saga';
import { call } from 'typed-redux-saga';
import { Provider } from 'react-redux';
import React from 'react';

import { asyncOperationsReducer, ComponentLifecycleService, OperationService, Root, useOperation } from '../index';
import { State } from '../reducer';

type Runner<S = any> = {
    run: (
        saga: Saga<
            [
                {
                    store: Store<S, Action>;
                    operationService: OperationService;
                    componentLifecycleService: ComponentLifecycleService;
                    TestProvider: React.FC<{
                        children: React.ReactNode;
                        store?: Store<any, Action>;
                        operationService?: OperationService;
                        componentLifecycleService?: ComponentLifecycleService;
                    }>;
                },
            ]
        >
    ) => Promise<{ result: any; state: S }>;
    store: Store<S, Action>;
};

function createDefaultReducer() {
    useOperation.setPath(state => state.asyncOperations);

    return combineReducers({
        asyncOperations: asyncOperationsReducer,
    });
}

export function getSagaRunner(): Runner<{ asyncOperations: State }>;
export function getSagaRunner<T extends Reducer<any, Action>>(reducer: T): Runner<ReturnType<T>>;
export function getSagaRunner<T extends Reducer<any, Action>>(reducer?: T) {
    const sagaMiddleware = createSagaMiddleware();
    const _store = applyMiddleware(sagaMiddleware)(createStore)(reducer || createDefaultReducer()) as Store<
        any,
        Action
    >;

    return {
        run: (saga: Saga<[{ store?: any }]>) =>
            sagaMiddleware
                .run(function* () {
                    const _operationService = new OperationService({ hash: {} });
                    const _componentLifecycleService = new ComponentLifecycleService(_operationService);

                    yield* call(_operationService.run);
                    yield* call(_componentLifecycleService.run);

                    function TestProvider({
                        children,
                        store,
                        operationService,
                        componentLifecycleService,
                    }: {
                        children: React.ReactNode;
                        store?: Store<any, Action>;
                        operationService?: OperationService;
                        componentLifecycleService?: ComponentLifecycleService;
                    }) {
                        return (
                            <Root
                                operationService={operationService ?? _operationService}
                                componentLifecycleService={componentLifecycleService ?? _componentLifecycleService}>
                                <Provider store={store ?? _store}>{children}</Provider>
                            </Root>
                        );
                    }

                    const result: any = yield* call(saga, {
                        store: _store,
                        operationService: _operationService,
                        componentLifecycleService: _componentLifecycleService,
                        TestProvider,
                    });

                    yield* call(_operationService.destroy);
                    yield* call(_componentLifecycleService.destroy);

                    return result;
                })
                .toPromise()
                .then(result => ({ result, state: _store.getState() })),
        store: _store,
    };
}
