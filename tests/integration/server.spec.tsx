import { call, delay } from 'typed-redux-saga';
import {
    ComponentLifecycleService,
    DisableSsrContext,
    Operation,
    OperationService,
    asyncOperationsReducer as reducer,
    Root,
    useOperation,
    useSaga,
} from '_lib/';
import React, { Suspense } from 'react';
import { createDeferred } from '_lib/utils/createDeferred';
import { getSagaRunner } from '_test/utils';
import { Provider } from 'react-redux';
import { renderToPipeableStream } from 'react-dom/server';

const DELAY = 5;

test('execute sagas on server', async () => {
    const runner = getSagaRunner(reducer);
    useOperation.setPath(x => x);

    const fn = jest.fn(() => 1);
    const fn2 = jest.fn(() => 2);
    const operationService = new OperationService({ hash: {} });
    const componentLifecycleService = new ComponentLifecycleService(operationService);

    const task = runner.run(function* () {
        yield* call(operationService.run);
        yield* call(componentLifecycleService.run);
    });

    const Item = () => {
        const { operationId } = useSaga({
            onLoad: function* () {
                yield* delay(DELAY);
                return fn2();
            },
        });

        return (
            <Suspense fallback="">
                <Operation operationId={operationId}>{() => <div />}</Operation>;
            </Suspense>
        );
    };

    const App = () => {
        const { operationId } = useSaga({
            onLoad: function* () {
                yield* delay(DELAY);
                return fn();
            },
        });

        return (
            <Suspense fallback="">
                <Operation operationId={operationId}>
                    {() => (
                        <>
                            <Item />
                            <DisableSsrContext.Provider value={true}>
                                {/* should be separate suspense or siblings also will be aborted */}
                                {/* https://github.com/overlookmotel/react-async-ssr#optimization-bail-out-of-rendering-when-suspended */}
                                <Item />
                            </DisableSsrContext.Provider>
                            <Item />
                        </>
                    )}
                </Operation>
            </Suspense>
        );
    };

    const defer = createDeferred();
    renderToPipeableStream(
        <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
            <Provider store={runner.store}>
                <App />
            </Provider>
        </Root>,
        {
            onAllReady() {
                defer.resolve();
            },
            onError(err) {
                console.error(err);
            },
        }
    );

    await defer.promise;
    task.cancel();
    await task.toPromise();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(2); // one call is disabled by DisableSsrContext
    const values = Array.from(runner.store.getState().values());
    expect(values[0]?.result).toBe(1);
    expect(values[1]?.result).toBe(2);
    expect(values[2]?.result).toBe(2);
});

test('execute nested sagas on server', async () => {
    const runner = getSagaRunner(reducer);
    useOperation.setPath(x => x);

    const fn = jest.fn(() => 1);
    const fn2 = jest.fn((x: number) => x + 2);
    const operationService = new OperationService({ hash: {} });
    const componentLifecycleService = new ComponentLifecycleService(operationService);

    const task = runner.run(function* () {
        yield* call(operationService.run);
        yield* call(componentLifecycleService.run);
    });

    const Item = (props: { x: number }) => {
        const { operationId } = useSaga(
            {
                onLoad: function* (x: number) {
                    yield* delay(DELAY);
                    return fn2(x);
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
            onLoad: function* () {
                yield* delay(DELAY);
                return fn();
            },
        });

        return (
            <Suspense fallback="">
                <Operation operationId={operationId}>{({ result }) => (result ? <Item x={result} /> : null)}</Operation>
            </Suspense>
        );
    };

    const defer = createDeferred();
    renderToPipeableStream(
        <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
            <Provider store={runner.store}>
                <App />
            </Provider>
        </Root>,
        {
            onAllReady() {
                defer.resolve();
            },
            onError(err) {
                console.error(err);
            },
        }
    );

    await defer.promise;
    task.cancel();
    await task.toPromise();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(2);
    const values = Array.from(runner.store.getState().values());
    expect(values[0]?.result).toBe(1);
    expect(values[1]?.result).toBe(3);
    expect(values[2]?.result).toBe(5);
});
