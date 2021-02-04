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
import { getSagaRunner } from '_test/utils';
import { Provider } from 'react-redux';
import { renderToStringAsync } from '_lib/serverRender';

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

        return <Operation operationId={operationId}>{() => <div />}</Operation>;
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
                                <Suspense fallback="">
                                    <Item />
                                </Suspense>
                            </DisableSsrContext.Provider>
                            <Item />
                        </>
                    )}
                </Operation>
            </Suspense>
        );
    };

    await renderToStringAsync(
        <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
            <Provider store={runner.store}>
                <App />
            </Provider>
        </Root>,
        { fallbackFast: true }
    );

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
            <Operation operationId={operationId}>
                {({ result }) => (result && result < 5 ? <Item x={result} /> : null)}
            </Operation>
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

    await renderToStringAsync(
        <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
            <Provider store={runner.store}>
                <App />
            </Provider>
        </Root>
    );

    task.cancel();
    await task.toPromise();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(2);
    const values = Array.from(runner.store.getState().values());
    expect(values[0]?.result).toBe(1);
    expect(values[1]?.result).toBe(3);
    expect(values[2]?.result).toBe(5);
});
