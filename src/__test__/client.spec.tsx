import { beforeEach, expect, test, vi } from 'vitest';
import { call, delay } from 'typed-redux-saga';
import React, { memo, Suspense, useContext, useEffect, useState } from 'react';
import { combineReducers } from 'redux';
import jsdom from 'jsdom';
import { Provider } from 'react-redux';

import {
    ComponentLifecycleService,
    createDeferred,
    getId,
    operation,
    Operation,
    OperationService,
    asyncOperationsReducer as reducer,
    Root,
    Service,
    useDI,
    useOperation,
    useSaga,
    useService,
    useServiceConsumer,
} from '../';
import { getSagaRunner, wait } from '_test/';
import { render } from '_root/utils';

const DELAY = 50;
useOperation.setPath(state => state.asyncOperations);

class TestService extends Service {
    toString() {
        return 'TestService';
    }

    @operation
    *operation0(counter: number) {
        yield* delay(DELAY);
        return counter;
    }

    @operation
    *operation1(counter: number) {
        yield* delay(DELAY);
        return counter;
    }
}

const Context = React.createContext<{
    counter: () => number;
    resolve: () => void;
} | null>(null);

const OperationWaiter: React.FC<{ operationId: any; setState: (x: number) => void }> = memo(
    ({ operationId, setState }) => {
        const context = useContext(Context);

        const operation = useOperation({
            operationId: operationId,
            suspense: true,
        });

        expect(operation?.isLoading).toBe(false);
        expect(operation?.result).toBe(context?.counter());

        useEffect(function mutation() {
            context?.resolve();
        });

        useEffect(() => {
            if (context && context.counter() < 2) {
                setState(context.counter());
            }
        }, []);

        return null;
    }
);

const InnerComponent: React.FC<{}> = () => {
    const context = useContext(Context);
    const { service: testService } = useServiceConsumer(TestService);
    const [state, setState] = useState(context?.counter());

    const { operationId } = useSaga(
        {
            id: 'test-id',
            onLoad: testService.operation0,
        },
        [state]
    );

    return <OperationWaiter operationId={operationId} setState={setState} />;
};

const TestComponent: React.FC<{}> = () => {
    const di = useDI();
    const service = di.createService(TestService);
    di.registerService(service);

    const { operationId } = useService(service);

    return <Operation operationId={operationId}>{() => <InnerComponent />}</Operation>;
};

beforeEach(() => {
    const { window } = new jsdom.JSDOM(`
        <html>
            <body>
                <div id="app"></div>
            </body>
        </html>
    `);

    (global as any).window = window;
    (global as any).document = window.document;
});

test('Nested operations with global Suspense ', async () => {
    const operationService = new OperationService({ hash: {} });
    const componentLifecycleService = new ComponentLifecycleService(operationService);

    const runner = getSagaRunner(
        combineReducers({
            asyncOperations: reducer,
        })
    );

    return runner
        .run(function* () {
            const defer = [createDeferred<unknown>(), createDeferred<unknown>()];
            let counter = 0;

            yield* call(operationService.run);
            yield* call(componentLifecycleService.run);

            const { el } = yield render(
                <Context.Provider
                    value={{
                        counter: () => counter,
                        resolve: () => defer[counter++].resolve(),
                    }}>
                    <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
                        <Provider store={runner.store}>
                            <Suspense fallback="Loading...">
                                <TestComponent />
                            </Suspense>
                        </Provider>
                    </Root>
                </Context.Provider>
            );

            expect(el?.innerHTML).toEqual('Loading...');
            yield defer[0].promise;
            expect(el?.innerHTML).not.toEqual('Loading...');
            yield defer[1].promise;
            expect(el?.innerHTML).not.toEqual('Loading...');

            yield* call(operationService.destroy);
            yield* call(componentLifecycleService.destroy);
        })
        .toPromise();
});

test('Execute nested sagas on client', async () => {
    const runner = getSagaRunner(
        combineReducers({
            asyncOperations: reducer,
        })
    );

    const fn = vi.fn(() => 1);
    const fn2 = vi.fn((x: number) => x + 2);
    const operationService = new OperationService();
    const componentLifecycleService = new ComponentLifecycleService(operationService);

    const task = runner.run(function* () {
        yield* call(operationService.run);
        yield* call(componentLifecycleService.run);
    });

    const Item = (props: { x: number }) => {
        const { operationId } = useSaga(
            {
                id: `op_${props.x}`,
                onLoad: function* (x: number) {
                    yield* delay(DELAY);
                    return fn2(x); // step 2 and 3
                },
            },
            [props.x]
        );

        return (
            <Suspense fallback="">
                <Operation operationId={operationId}>
                    {({ result }) => (result && result < 5 ? <Item x={result} /> : null)}
                </Operation>
            </Suspense>
        );
    };

    const App = () => {
        const { operationId } = useSaga({
            id: 'init-app',
            onLoad: function* () {
                yield* delay(DELAY);
                return fn(); // step 1
            },
        });

        return (
            <Suspense fallback="">
                <Operation operationId={operationId}>{({ result }) => (result ? <Item x={result} /> : null)}</Operation>
            </Suspense>
        );
    };

    render(
        <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
            <Provider store={runner.store}>
                <App />
            </Provider>
        </Root>
    );

    for (let step = 1; step <= 3; step++) {
        await wait(DELAY * 20);
    }

    task.cancel();
    await task.toPromise();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(2);
    const values = Array.from(runner.store.getState().asyncOperations.values());
    expect(values[0]?.result).toBe(1);
    expect(values[1]?.result).toBe(3);
    expect(values[2]?.result).toBe(5);
});

test('useSaga + useOperation in same component', async () => {
    const operationService = new OperationService({ hash: {} });
    const componentLifecycleService = new ComponentLifecycleService(operationService);

    const runner = getSagaRunner(
        combineReducers({
            asyncOperations: reducer,
        })
    );

    return runner
        .run(function* () {
            const defer = createDeferred<unknown>();

            yield* call(operationService.run);
            yield* call(componentLifecycleService.run);

            function App() {
                const { operationId } = useSaga({
                    id: 'app-init',
                    onLoad: function* () {
                        yield wait(DELAY);
                        return 1;
                    },
                });

                const { result } = useOperation({
                    operationId,
                    suspense: true,
                });

                expect(result).toBe(1);

                useEffect(() => {
                    defer.resolve();
                });

                return null;
            }

            const { el } = yield render(
                <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
                    <Provider store={runner.store}>
                        <Suspense fallback="Loading...">
                            <App />
                        </Suspense>
                    </Provider>
                </Root>
            );

            expect(el?.innerHTML).toEqual('Loading...');
            yield defer.promise;
            expect(el?.innerHTML).not.toEqual('Loading...');

            yield* call(operationService.destroy);
            yield* call(componentLifecycleService.destroy);
        })
        .toPromise();
});

test('useSaga + double useOperation in same component', async () => {
    const operationService = new OperationService({ hash: {} });
    const componentLifecycleService = new ComponentLifecycleService(operationService);
    const service = new TestService(operationService);

    const runner = getSagaRunner(
        combineReducers({
            asyncOperations: reducer,
        })
    );

    return runner
        .run(function* () {
            const defer = createDeferred<unknown>();

            yield* call(operationService.run);
            yield* call(componentLifecycleService.run);

            function App() {
                useSaga({
                    id: 'app-init',
                    onLoad: function* () {
                        yield* call(service.operation0, 0);
                        yield* call(service.operation1, 1);
                    },
                });

                const op1 = useOperation({
                    operationId: getId(service.operation0),
                    suspense: true,
                });

                const op2 = useOperation({
                    operationId: getId(service.operation1),
                    suspense: true,
                });

                expect(op1.result).toBe(0);
                expect(op2.result).toBe(1);

                useEffect(() => {
                    defer.resolve();
                });

                return null;
            }

            const { el } = yield render(
                <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
                    <Provider store={runner.store}>
                        <Suspense fallback="Loading...">
                            <App />
                        </Suspense>
                    </Provider>
                </Root>
            );

            expect(el?.innerHTML).toEqual('Loading...');
            yield defer.promise;
            expect(el?.innerHTML).not.toEqual('Loading...');

            yield* call(operationService.destroy);
            yield* call(componentLifecycleService.destroy);
        })
        .toPromise();
});
