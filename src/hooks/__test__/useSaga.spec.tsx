import { describe, expect, test, vi } from 'vitest';

import { applyMiddleware, createStore } from 'redux';
import React, { JSX, useState } from 'react';
import { call } from 'typed-redux-saga';
import createSagaMiddleware from 'redux-saga';
import jsdom from 'jsdom';
import { Provider } from 'react-redux';

import { ComponentLifecycleService, Service } from '../../services';
import { createDeferred } from '../../utils/createDeferred';
import { operation } from '../../decorators';
import { OperationId } from '../../types';
import { OperationService } from '../../services';
import reducer from '../../reducer';
import { Root } from '../../components/Root';
import { useSaga } from '../useSaga';

import { exact, wait } from '_test/utils';
import { render } from '_root/utils';

const DELAY = 50;
const ARGS = ['xxx'];

type Props = {
    operationService: OperationService;
    componentLifecycleService: ComponentLifecycleService;
    processOperationId?: (operationId: string) => void;
    children?: (x: number) => JSX.Element;
};

describe('useSaga', () => {
    function initTest() {
        const sagaMiddleware = createSagaMiddleware();
        const store = applyMiddleware(sagaMiddleware)(createStore)(reducer);

        const { window } = new jsdom.JSDOM(`
            <html>
                <body>
                    <div id="app"></div>
                </body>
            </html>
        `);

        (global as any).window = window;
        (global as any).document = window.document;

        const processLoading = vi.fn((...args: any[]) => ({}));
        const processDisposing = vi.fn((...args: any[]) => ({}));

        const onLoad = function* (...args: [string, number]) {
            yield wait(DELAY);
            processLoading(...args);
        };

        const onDispose = function* (...args: [string, number]) {
            processDisposing(...args);
        };

        const TestComponent: React.FC<Pick<Props, 'processOperationId'> & { x: number; operationId?: string }> = ({
            x,
            operationId: externalId,
            processOperationId,
        }) => {
            const { operationId, reload } = useSaga({ id: externalId ?? 'init-app', onLoad, onDispose }, [...ARGS, x]);

            if (processOperationId) {
                processOperationId(operationId);
            }

            return <button id="reload" onClick={reload} />;
        };

        const App: React.FC<Props> = ({
            processOperationId,
            operationService,
            componentLifecycleService,
            children,
        }) => {
            const [x, setX] = useState(0);

            return (
                <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
                    <Provider store={store}>
                        {children ? children(x) : <TestComponent x={x} processOperationId={processOperationId} />}
                        <button id="update" onClick={() => setX(x + 1)}>
                            b
                        </button>
                    </Provider>
                </Root>
            );
        };

        return { App, TestComponent, processLoading, processDisposing, sagaMiddleware, store };
    }

    test('Saga methods were invoked with proper args', async () => {
        const { sagaMiddleware, App, processLoading, processDisposing } = initTest();

        const operationService = new OperationService({ hash: {} });
        const componentLifecycleService = new ComponentLifecycleService(operationService);

        const unmountDefer = createDeferred();

        const task = sagaMiddleware.run(function* () {
            yield* call(componentLifecycleService.run);
            yield unmountDefer.promise;
            yield* call(componentLifecycleService.destroy);
        });

        const { unmount } = await render(
            <App operationService={operationService} componentLifecycleService={componentLifecycleService} />
        );

        await wait(DELAY * 2);

        window.document.getElementById('update')?.click();
        await wait(DELAY * 2);

        await unmount();
        unmountDefer.resolve();
        task.cancel();
        await task.toPromise();

        expect(processLoading).toHaveBeenCalledTimes(2);
        expect(processDisposing).toHaveBeenCalledTimes(2);

        expect(processLoading).toHaveBeenNthCalledWith(1, ...ARGS, 0);
        expect(processDisposing).toHaveBeenNthCalledWith(1, ...ARGS, 0);

        expect(processLoading).toHaveBeenNthCalledWith(2, ...ARGS, 1);
        expect(processDisposing).toHaveBeenNthCalledWith(2, ...ARGS, 1);
    });

    test('useSaga creates and destroys operation', async () => {
        const { sagaMiddleware, App, store } = initTest();

        const operationService = new OperationService({ hash: {} });
        const componentLifecycleService = new ComponentLifecycleService(operationService);

        const unmountDefer = createDeferred();
        let operationId: string;
        const processOperationId = (id: string) => (operationId = id);

        const task = sagaMiddleware.run(function* () {
            yield* call(componentLifecycleService.run);
            yield unmountDefer.promise;
            yield call(componentLifecycleService.destroy);
        });

        const { unmount } = await render(
            <App
                operationService={operationService}
                componentLifecycleService={componentLifecycleService}
                processOperationId={processOperationId}
            />
        );

        await wait(DELAY * 2);

        expect(store.getState().get(operationId!)).toBeTruthy();
        await unmount();
        expect(store.getState().get(operationId!)).toBeFalsy();

        unmountDefer.resolve();
        task.cancel();
        await task.toPromise();
    });

    test("Each Component runs it's own operation", async () => {
        const { sagaMiddleware, App, TestComponent, processLoading } = initTest();

        const operationService = new OperationService({ hash: {} });
        const componentLifecycleService = new ComponentLifecycleService(operationService);

        const unmountDefer = createDeferred();
        let operationId1 = '_init';
        let operationId2 = '_init';
        const processOperationId1 = (id: string) => (operationId1 = id);
        const processOperationId2 = (id: string) => (operationId2 = id);

        const task = sagaMiddleware.run(function* () {
            yield* call(componentLifecycleService.run);
            yield unmountDefer.promise;
            yield* call(componentLifecycleService.destroy);
        });

        const { unmount } = await render(
            <App operationService={operationService} componentLifecycleService={componentLifecycleService}>
                {() => (
                    <>
                        <TestComponent x={1} processOperationId={processOperationId1} />
                        <TestComponent x={2} operationId="test-2" processOperationId={processOperationId2} />
                    </>
                )}
            </App>
        );

        await wait(DELAY * 2);

        expect(operationId1).not.toBe(operationId2);
        expect(processLoading).toHaveBeenCalledTimes(2);
        expect(processLoading.mock.calls).toContainEqual([...ARGS, 1]);
        expect(processLoading.mock.calls).toContainEqual([...ARGS, 2]);

        await unmount();
        unmountDefer.resolve();

        task.cancel();
        await task.toPromise();
    });

    test('Reload init new load round', async () => {
        const { sagaMiddleware, App, processLoading, processDisposing } = initTest();

        const operationService = new OperationService({ hash: {} });
        const componentLifecycleService = new ComponentLifecycleService(operationService);

        const reloadCount = 5;
        const unmountDefer = createDeferred();

        const task = sagaMiddleware.run(function* () {
            yield* call(componentLifecycleService.run);
            yield unmountDefer.promise;
            yield* call(componentLifecycleService.destroy);
        });

        const { unmount } = await render(
            <App operationService={operationService} componentLifecycleService={componentLifecycleService} />
        );

        await wait(DELAY * 2);

        expect(processDisposing).toHaveBeenCalledTimes(0);
        expect(processLoading).toHaveBeenCalledTimes(1);

        for (let i = 0; i < reloadCount; i++) {
            window.document.getElementById('reload')?.click();
            await wait(DELAY * 2);
        }

        expect(processDisposing).toHaveBeenCalledTimes(reloadCount);
        expect(processLoading).toHaveBeenCalledTimes(reloadCount + 1);

        await unmount();
        unmountDefer.resolve();
        task.cancel();
        await task.toPromise();
    });

    test('hash collected from ssr applied', async () => {
        const { sagaMiddleware, App } = initTest();

        const fn = vi.fn(() => {});
        const id = 'test_id' as OperationId<void, [number]>;
        class TestService extends Service {
            toString() {
                return 'TestService';
            }

            @operation(id)
            *method(x: number) {
                fn();
            }
        }

        const operationService = new OperationService({
            hash: {
                [id]: {
                    args: [0],
                    result: undefined,
                },
            },
        });
        const componentLifecycleService = new ComponentLifecycleService(operationService);
        const service = new TestService(operationService);

        const TestComponent = ({ x }: { x: number }) => {
            useSaga({ id: 'init-app', onLoad: service.method }, [x]);
            return null;
        };

        const unmountDefer = createDeferred();

        const task = sagaMiddleware.run(function* () {
            yield* call(componentLifecycleService.run);
            yield unmountDefer.promise;
            yield* call(componentLifecycleService.destroy);
        });

        const { unmount } = await render(
            <App operationService={operationService} componentLifecycleService={componentLifecycleService}>
                {x => <TestComponent x={x} />}
            </App>
        );

        await wait(DELAY * 2);

        // first load skipped due to ssr
        expect(fn).toHaveBeenCalledTimes(0);

        window.document.getElementById('update')?.click();
        await wait(DELAY * 2);

        // next load proceed as usual
        expect(fn).toHaveBeenCalledTimes(1);

        await unmount();
        unmountDefer.resolve();

        task.cancel();
        await task.toPromise();
    });

    test('types are correctly inferred from hook args', () => {
        // @ts-ignore
        function TestComponent() {
            const arg0 = 1;
            const arg1 = '1';
            const args: [number, string] = [arg0, arg1];

            useSaga(
                {
                    id: 'op_1',
                    onLoad: function* (a, b) {
                        exact<typeof a, number>(true);
                        exact<typeof b, string>(true);
                    },
                },
                args
            );

            useSaga(
                {
                    id: 'op_2',
                    onLoad: function* (a, b) {
                        exact<typeof a, 1>(true);
                        exact<typeof b, '1'>(true);
                    },
                },
                [arg0, arg1] as const
            );

            useSaga<[number, string], void>(
                {
                    id: 'op_3',
                    onLoad: function* (a, b) {
                        exact<typeof a, number>(true);
                        exact<typeof b, string>(true);
                    },
                },
                [arg0, arg1]
            );

            useSaga<[string, number], void>(
                {
                    id: 'op_4',
                    onLoad: function* (a, b) {},
                },
                // @ts-expect-error
                [arg0, arg1]
            );

            useSaga<[], void>(
                // @ts-expect-error
                {
                    onLoad: function* () {},
                },
                []
            );

            return null;
        }
    });
});
