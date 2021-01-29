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
import { call } from 'typed-redux-saga';
import { getSagaRunner } from '_test/utils';
import { Provider } from 'react-redux';
import { renderToStringAsync } from '_lib/serverRender';

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
                return fn2();
            },
        });

        return (
            <Suspense fallback="">
                <Operation operationId={operationId}>{() => <div />}</Operation>
            </Suspense>
        );
    }


    const App = () => {
        const { operationId } = useSaga({
            onLoad: function* () {
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
                                <Item />
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
        </Root>
    );

    task.cancel();
    await task.toPromise();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(2); // one call is disabled by DisableSsrContext
    expect(Object.entries(runner.store.getState())[0][1]?.result).toBe(1)
    expect(Object.entries(runner.store.getState())[1][1]?.result).toBe(2)
    expect(Object.entries(runner.store.getState())[2][1]?.result).toBe(2)
});
