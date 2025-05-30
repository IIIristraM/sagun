/**
 * @jest-environment jsdom
 */

import { beforeEach, expect, test, vi } from 'vitest';

import { applyMiddleware, createStore } from 'redux';
import { call, delay } from 'typed-redux-saga';
import React, { Suspense, useEffect, useState } from 'react';
import createSagaMiddleware from 'redux-saga';
import { Provider } from 'react-redux';

import { ComponentLifecycleService, getId, OperationService, Service } from '../../services';
import reducer, { actions } from '../../reducer';
import { createDeferred } from '../../utils/createDeferred';
import { operation } from '../../decorators';
import { OperationId } from '../../types';
import { Root } from '../../components/Root';
import { useOperation } from '../useOperation';
import { useSaga } from '../useSaga';

import { render } from '_root/utils';

const OPERATION_ID = 'OPERATION_ID' as OperationId<string>;
const DELAY = 50;

useOperation.setPath(state => state);

beforeEach(() => {
    window.document.body.innerHTML = `
    <div>
        <div id="app"></div>
    </div>`;
});

test('Component gets the operation', () => {
    const sagaMiddleware = createSagaMiddleware();
    const store = applyMiddleware(sagaMiddleware)(createStore)(reducer);
    const operationService = new OperationService({ hash: {} });
    const componentLifecycleService = new ComponentLifecycleService(operationService);

    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @operation
        *getResult() {
            return 1;
        }
    }

    const testService = new TestService(operationService);

    const renderDefer = createDeferred();
    const TestComponent: React.FC<{}> = () => {
        const operation = useOperation({ operationId: getId(testService.getResult)! });

        useEffect(() => {
            renderDefer.resolve();
        });

        expect(operation.result).toEqual(1);
        return <span>{operation?.result}</span>;
    };

    return sagaMiddleware
        .run(function* () {
            yield* call(operationService.run);
            yield* call(testService.getResult);

            render(
                <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
                    <Provider store={store}>
                        <TestComponent />
                    </Provider>
                </Root>
            );

            yield renderDefer.promise;
            yield* call(operationService.destroy);
        })
        .toPromise();
});

test('No errors when no operation and no default state', () => {
    const sagaMiddleware = createSagaMiddleware();
    const store = applyMiddleware(sagaMiddleware)(createStore)(reducer);
    const operationService = new OperationService({ hash: {} });
    const componentLifecycleService = new ComponentLifecycleService(operationService);

    const renderDefer = createDeferred();
    const TestComponent: React.FC<{}> = () => {
        const operation = useOperation({
            operationId: OPERATION_ID,
        });

        useEffect(() => {
            renderDefer.resolve();
        });

        return <span>{operation?.result}</span>;
    };

    return sagaMiddleware
        .run(function* () {
            yield* call(operationService.run);

            render(
                <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
                    <Provider store={store}>
                        <TestComponent />
                    </Provider>
                </Root>
            );

            yield renderDefer.promise;
            yield* call(operationService.destroy);
        })
        .toPromise();
});

test('Component updates on operation changed', () => {
    const sagaMiddleware = createSagaMiddleware();
    const store = applyMiddleware(sagaMiddleware)(createStore)(reducer);
    const operationService = new OperationService({ hash: {} });
    const componentLifecycleService = new ComponentLifecycleService(operationService);
    const func = vi.fn((isLoading?: boolean) => ({}));

    let renderDefer = createDeferred();
    const TestComponent: React.FC<{}> = () => {
        const operation = useOperation({ operationId: OPERATION_ID });

        useEffect(() => {
            func(operation?.isLoading);
            renderDefer.resolve();
        });

        return <span>{operation?.result}</span>;
    };

    return sagaMiddleware
        .run(function* () {
            yield* call(operationService.run);

            render(
                <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
                    <Provider store={store}>
                        <TestComponent />
                    </Provider>
                </Root>
            );

            yield renderDefer.promise;
            renderDefer = createDeferred();
            store.dispatch(actions.addOrUpdateOperation({ id: OPERATION_ID, isLoading: true }));
            yield renderDefer.promise;
            renderDefer = createDeferred();
            store.dispatch(actions.addOrUpdateOperation({ id: OPERATION_ID, isLoading: false }));
            yield renderDefer.promise;

            expect(func).toBeCalledTimes(3);
            expect(func).toHaveBeenNthCalledWith(2, true);
            expect(func).toHaveBeenNthCalledWith(3, false);

            yield* call(operationService.destroy);
        })
        .toPromise();
});

test('Nested operations with global Suspense', async () => {
    const sagaMiddleware = createSagaMiddleware();
    const store = applyMiddleware(sagaMiddleware)(createStore)(reducer);
    const operationService = new OperationService({ hash: {} });
    const componentLifecycleService = new ComponentLifecycleService(operationService);

    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @operation
        *operation0() {
            yield* delay(DELAY);
            return '0';
        }

        @operation
        *operation1() {
            yield* delay(DELAY);
            return '1';
        }
    }

    const testService = new TestService(operationService);

    return sagaMiddleware
        .run(function* () {
            const defer = createDeferred<unknown>();

            const InnerComponent: React.FC<{}> = () => {
                const operation2 = useOperation({
                    operationId: getId(testService.operation1)!,
                    suspense: true,
                });

                expect(operation2?.isLoading).toBe(false);
                expect(operation2?.result).toBe('1');

                useEffect(() => {
                    defer.resolve();
                });

                return null;
            };

            const TestComponent: React.FC<{}> = () => {
                const operation1 = useOperation({
                    operationId: getId(testService.operation0)!,
                    suspense: true,
                });

                expect(operation1?.isLoading).toBe(false);
                expect(operation1?.result).toBe('0');

                return <InnerComponent />;
            };

            const initDefer = createDeferred<unknown>();
            const Wrapper = () => {
                useEffect(() => {
                    initDefer.resolve();
                });

                return (
                    <Suspense fallback="Loading...">
                        <TestComponent />
                    </Suspense>
                );
            };

            yield* call(operationService.run);

            const { el } = yield render(
                <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
                    <Provider store={store}>
                        <Wrapper />
                    </Provider>
                </Root>
            );

            yield initDefer.promise;
            expect(el?.innerHTML).toEqual('Loading...');

            yield* call(testService.operation0);
            yield* call(testService.operation1);
            yield defer.promise;

            expect(el?.innerHTML).not.toEqual('Loading...');
            yield* call(operationService.destroy);
        })
        .toPromise();
});

test('Component renders after the longest operation is completed', async () => {
    const sagaMiddleware = createSagaMiddleware();
    const store = applyMiddleware(sagaMiddleware)(createStore)(reducer);
    const operationService = new OperationService({ hash: {} });
    const componentLifecycleService = new ComponentLifecycleService(operationService);

    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @operation
        *operation0() {
            yield* delay(DELAY);
            return '0';
        }

        @operation
        *operation1() {
            yield* delay(DELAY);
            return '1';
        }
    }

    const testService = new TestService(operationService);

    return sagaMiddleware
        .run(function* () {
            const defer = createDeferred<unknown>();
            const start = Date.now();

            const TestComponent: React.FC<{}> = () => {
                const operation1 = useOperation({
                    operationId: getId(testService.operation0)!,
                    suspense: true,
                });
                const operation2 = useOperation({
                    operationId: getId(testService.operation1)!,
                    suspense: true,
                });

                expect(operation1?.isLoading).toBe(false);
                expect(operation2?.isLoading).toBe(false);
                expect(operation1?.result).toBe('0');
                expect(operation2?.result).toBe('1');
                expect(Date.now() - start).toBeGreaterThanOrEqual(DELAY * 2);

                useEffect(() => {
                    defer.resolve();
                });

                return null;
            };

            const initDefer = createDeferred<unknown>();
            const TestComponentWrap: React.FC<{}> = () => {
                useEffect(() => {
                    initDefer.resolve();
                });

                return (
                    <Suspense fallback="Loading...">
                        <TestComponent />
                    </Suspense>
                );
            };

            yield* call(operationService.run);

            const { el } = yield render(
                <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
                    <Provider store={store}>
                        <TestComponentWrap />
                    </Provider>
                </Root>
            );

            yield initDefer.promise;
            expect(el?.innerHTML).toEqual('Loading...');

            yield* call(testService.operation0);
            yield* call(testService.operation1);
            yield defer.promise;

            expect(el?.innerHTML).not.toEqual('Loading...');
            yield* call(operationService.destroy);
        })
        .toPromise();
});

test('Components release operations', () => {
    const sagaMiddleware = createSagaMiddleware();
    const store = applyMiddleware(sagaMiddleware)(createStore)(reducer);
    const operationService = new OperationService({ hash: {} });
    const componentLifecycleService = new ComponentLifecycleService(operationService);

    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @operation
        *getResult() {
            return 1;
        }
    }

    const testService = new TestService(operationService);
    const operationId = getId(testService.getResult)!;
    const renderDefer = createDeferred();
    const destroyDefer = createDeferred();

    const App: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
        useSaga({ id: 'init-app', onLoad: testService.getResult });
        const [visible, toggle] = useState(true);

        return (
            <>
                {visible && children}
                <button
                    id="switch"
                    onClick={() => {
                        toggle(false);
                    }}>
                    click
                </button>
            </>
        );
    };

    const TestComponent: React.FC<{}> = () => {
        const operation = useOperation({ operationId, suspense: true });

        useEffect(() => {
            renderDefer.resolve();

            return () => {
                destroyDefer.resolve();
            };
        });

        expect(operation?.result).toEqual(1);
        return <span>{operation?.result}</span>;
    };

    return sagaMiddleware
        .run(function* () {
            yield* call(operationService.run);
            yield* call(componentLifecycleService.run);

            render(
                <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
                    <Provider store={store}>
                        <App>
                            <Suspense fallback="Loading...">
                                <TestComponent />
                            </Suspense>
                        </App>
                    </Provider>
                </Root>
            );

            yield renderDefer.promise;
            expect(store.getState().get(operationId)).toBeTruthy();

            const button = window.document.getElementById('switch') as HTMLButtonElement;
            button.click();
            yield destroyDefer.promise;
            yield* call(testService.destroy);

            expect(store.getState().get(operationId)).toBe(undefined);

            yield* call(componentLifecycleService.destroy);
            yield* call(operationService.destroy);
        })
        .toPromise();
});
