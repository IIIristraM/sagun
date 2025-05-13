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
} from '..';
import { expect, test, vi } from 'vitest';
import React, { Suspense } from 'react';

import { Provider } from 'react-redux';

import { getSagaRunner } from '_test/';
import { serverRender } from '_root/utils';

const DELAY = 5;

test('execute sagas on server', async () => {
    const runner = getSagaRunner(reducer);
    useOperation.setPath(x => x);

    const fn = vi.fn(() => 1);
    const fn2 = vi.fn(() => 2);
    const operationService = new OperationService({ hash: {} });
    const componentLifecycleService = new ComponentLifecycleService(operationService);

    const task = runner.run(function* () {
        yield* call(operationService.run);
        yield* call(componentLifecycleService.run);
    });

    const Item = ({ id }: { id: string }) => {
        const { operationId } = useSaga({
            id,
            onLoad: function* () {
                yield* delay(DELAY);
                return fn2();
            },
        });

        return <Operation operationId={operationId}>{() => <div />}</Operation>;
    };

    const App = () => {
        const { operationId } = useSaga({
            id: 'app-init',
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
                            <Item id="item_1" />
                            <DisableSsrContext.Provider value={true}>
                                {/* should be separate suspense or siblings also will be aborted */}
                                {/* https://github.com/overlookmotel/react-async-ssr#optimization-bail-out-of-rendering-when-suspended */}
                                <Item id="item_2" />
                            </DisableSsrContext.Provider>
                            <Item id="item_3" />
                        </>
                    )}
                </Operation>
            </Suspense>
        );
    };

    await serverRender(
        <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
            <Provider store={runner.store}>
                <App />
            </Provider>
        </Root>
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

    const fn = vi.fn(() => 1);
    const fn2 = vi.fn((x: number) => x + 2);
    const operationService = new OperationService({ hash: {} });
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
            id: 'init-app',
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

    await serverRender(
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
