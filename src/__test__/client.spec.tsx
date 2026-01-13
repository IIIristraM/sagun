import { beforeEach, expect, test, vi } from 'vitest';
import { call, delay } from 'typed-redux-saga';
import React, { memo, Suspense, useContext, useEffect, useState } from 'react';
import jsdom from 'jsdom';

import {
    createDeferred,
    getId,
    operation,
    Operation,
    Service,
    useDI,
    useOperation,
    useSaga,
    useService,
    useServiceConsumer,
} from '../';

import { getSagaRunner } from '../test-utils';

import { render } from '_root/utils';
import { wait } from '_test/';

const DELAY = 50;

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
    const runner = getSagaRunner();

    return runner.run(function* ({ TestProvider }) {
        const defer = [createDeferred<unknown>(), createDeferred<unknown>()];
        let counter = 0;

        const { el } = yield render(
            <Context.Provider
                value={{
                    counter: () => counter,
                    resolve: () => defer[counter++].resolve(),
                }}>
                <TestProvider>
                    <Suspense fallback="Loading...">
                        <TestComponent />
                    </Suspense>
                </TestProvider>
            </Context.Provider>
        );

        expect(el?.innerHTML).toEqual('Loading...');
        yield defer[0].promise;
        expect(el?.innerHTML).not.toEqual('Loading...');
        yield defer[1].promise;
        expect(el?.innerHTML).not.toEqual('Loading...');
    });
});

test('Execute nested sagas on client', async () => {
    const runner = getSagaRunner();

    const fn = vi.fn(() => 1);
    const fn2 = vi.fn((x: number) => x + 2);

    return runner.run(function* ({ TestProvider, store }) {
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
                    <Operation operationId={operationId}>
                        {({ result }) => (result ? <Item x={result} /> : null)}
                    </Operation>
                </Suspense>
            );
        };

        render(
            <TestProvider>
                <App />
            </TestProvider>
        );

        for (let step = 1; step <= 3; step++) {
            yield wait(DELAY * 20);
        }

        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn2).toHaveBeenCalledTimes(2);
        const values = Array.from(store.getState().asyncOperations.values());
        expect(values[0]?.result).toBe(1);
        expect(values[1]?.result).toBe(3);
        expect(values[2]?.result).toBe(5);
    });
});

test('useSaga + useOperation in same component', async () => {
    const runner = getSagaRunner();

    return runner.run(function* ({ TestProvider, store }) {
        const defer = createDeferred<unknown>();

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
            <TestProvider>
                <Suspense fallback="Loading...">
                    <App />
                </Suspense>
            </TestProvider>
        );

        expect(el?.innerHTML).toEqual('Loading...');
        yield defer.promise;
        expect(el?.innerHTML).not.toEqual('Loading...');
    });
});

test('useSaga + double useOperation in same component', async () => {
    const runner = getSagaRunner();

    return runner.run(function* ({ TestProvider, operationService, store }) {
        const defer = createDeferred<unknown>();
        const service = new TestService(operationService);

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
            <TestProvider>
                <Suspense fallback="Loading...">
                    <App />
                </Suspense>
            </TestProvider>
        );

        expect(el?.innerHTML).toEqual('Loading...');
        yield defer.promise;
        expect(el?.innerHTML).not.toEqual('Loading...');
    });
});

test('useSaga + useOperation + reload in same component', async () => {
    const runner = getSagaRunner();

    return runner.run(function* ({ TestProvider, store }) {
        const defer = createDeferred<unknown>();

        const reloadCount = 5;
        let mountedCount = 0;
        const processLoading = vi.fn((...args: any[]) => ({}));
        const processDisposing = vi.fn((...args: any[]) => ({}));

        const onLoad = function* () {
            yield wait(DELAY);
            processLoading();
            return 1;
        };

        const onDispose = function* () {
            processDisposing();
        };

        function App() {
            const { operationId, reload } = useSaga({
                id: 'app-init-reload',
                onLoad,
                onDispose,
            });

            const { result } = useOperation({
                operationId,
                suspense: true,
            });

            useEffect(() => {
                mountedCount++;
                defer.resolve();
            }, []);

            expect(result).toBe(1);

            return (
                <div id="reload" onClick={reload}>
                    {result}
                </div>
            );
        }

        yield render(
            <TestProvider>
                <Suspense fallback="">
                    <App />
                </Suspense>
            </TestProvider>
        );

        yield defer.promise;

        expect(processLoading).toHaveBeenCalledTimes(1);
        expect(processDisposing).toHaveBeenCalledTimes(0);

        for (let i = 0; i < reloadCount; i++) {
            window.document.getElementById('reload')?.click();
            yield wait(DELAY * 2);
        }

        expect(processDisposing).toHaveBeenCalledTimes(reloadCount);
        expect(processLoading).toHaveBeenCalledTimes(reloadCount + 1);
        expect(mountedCount).toBe(1);
    });
});

test('remount component with useSaga', async () => {
    const runner = getSagaRunner();

    return runner.run(function* ({ TestProvider, componentLifecycleService }) {
        let defer = createDeferred<unknown>();

        const reloadCount = 3;
        let mountedCount = 0;
        const processLoading = vi.fn((...args: any[]) => ({}));
        const processDisposing = vi.fn((...args: any[]) => ({}));

        let record = '';

        const onLoad = function* () {
            record += 'p';
            processLoading();
            return 1;
        };

        const onDispose = function* () {
            record += 'd';
            processDisposing();
        };

        function App() {
            const [key, setKey] = useState(0);

            return (
                <>
                    <button id="reload" onClick={() => setKey(key + 1)}>
                        Reload
                    </button>
                    <InnerComponent key={key} />
                </>
            );
        }

        function InnerComponent() {
            const { operationId } = useSaga({
                id: 'app-init-reload',
                onLoad,
                onDispose,
            });

            const { result } = useOperation({
                operationId,
                suspense: true,
            });

            useEffect(() => {
                record += 'm';
                mountedCount++;
                defer.resolve();
            }, []);

            expect(result).toBe(1);

            return null;
        }

        yield render(
            <TestProvider>
                <Suspense fallback="">
                    <App />
                </Suspense>
            </TestProvider>
        );

        yield defer.promise;
        defer = createDeferred<unknown>();

        expect(processLoading).toHaveBeenCalledTimes(1);
        expect(processDisposing).toHaveBeenCalledTimes(0);

        for (let i = 0; i < reloadCount; i++) {
            window.document.getElementById('reload')?.click();
            console.log('reload click', i);
            yield defer.promise;
            defer = createDeferred<unknown>();
        }

        yield wait(DELAY * 2);
        expect(processDisposing).toHaveBeenCalledTimes(reloadCount);
        expect(mountedCount).toBe(reloadCount + 1);
        expect(processLoading).toHaveBeenCalledTimes(reloadCount + 1);
        expect(record).toBe('pm' + 'mdp'.repeat(reloadCount));

        expect(componentLifecycleService.getCurrentExecution('app-init-reload')).not.toBeUndefined();
    });
});
