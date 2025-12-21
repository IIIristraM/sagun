import { describe, expect, test, vi } from 'vitest';

import React, { JSX, useState } from 'react';
import { call } from 'typed-redux-saga';
import jsdom from 'jsdom';

import { ComponentLifecycleService, Service } from '../../services';
import { createDeferred } from '../../utils/createDeferred';
import { operation } from '../../decorators';
import { OperationId } from '../../types';
import { OperationService } from '../../services';
import { useSaga } from '../useSaga';

import { exact, wait } from '_test/utils';
import { render } from '_root/utils';

import { getSagaRunner } from '../../test-utils';

const DELAY = 50;
const ARGS = ['xxx'];

type Props = {
    processOperationId?: (operationId: string) => void;
    children?: (x: number) => JSX.Element;
};

describe('useSaga', () => {
    function initTest() {
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

        const App: React.FC<Props> = ({ processOperationId, children }) => {
            const [x, setX] = useState(0);

            return (
                <>
                    {children ? children(x) : <TestComponent x={x} processOperationId={processOperationId} />}
                    <button id="update" onClick={() => setX(x + 1)}>
                        b
                    </button>
                </>
            );
        };

        return { App, TestComponent, processLoading, processDisposing };
    }

    test('Saga methods were invoked with proper args', async () => {
        const { App, processLoading, processDisposing } = initTest();
        const runner = getSagaRunner();

        const unmountDefer = createDeferred();

        return runner.run(function* ({ TestProvider }) {
            const { unmount } = yield render(
                <TestProvider>
                    <App />
                </TestProvider>
            );

            yield wait(DELAY * 2);

            window.document.getElementById('update')?.click();
            yield wait(DELAY * 2);

            yield unmount();
            unmountDefer.resolve();

            expect(processLoading).toHaveBeenCalledTimes(2);
            expect(processDisposing).toHaveBeenCalledTimes(2);

            expect(processLoading).toHaveBeenNthCalledWith(1, ...ARGS, 0);
            expect(processDisposing).toHaveBeenNthCalledWith(1, ...ARGS, 0);

            expect(processLoading).toHaveBeenNthCalledWith(2, ...ARGS, 1);
            expect(processDisposing).toHaveBeenNthCalledWith(2, ...ARGS, 1);
        });
    });

    test('useSaga creates and destroys operation', async () => {
        const { App } = initTest();
        const runner = getSagaRunner();

        const unmountDefer = createDeferred();
        let operationId: string;
        const processOperationId = (id: string) => (operationId = id);

        return runner.run(function* ({ store, TestProvider }) {
            const { unmount } = yield render(
                <TestProvider>
                    <App processOperationId={processOperationId} />
                </TestProvider>
            );

            yield wait(DELAY * 2);

            expect(store.getState().asyncOperations.get(operationId!)).toBeTruthy();
            yield unmount();
            expect(store.getState().asyncOperations.get(operationId!)).toBeFalsy();

            unmountDefer.resolve();
        });
    });

    test("Each Component runs it's own operation", async () => {
        const { App, TestComponent, processLoading } = initTest();
        const runner = getSagaRunner();

        const unmountDefer = createDeferred();
        let operationId1 = '_init';
        let operationId2 = '_init';
        const processOperationId1 = (id: string) => (operationId1 = id);
        const processOperationId2 = (id: string) => (operationId2 = id);

        return runner.run(function* ({ TestProvider }) {
            const { unmount } = yield render(
                <TestProvider>
                    <App>
                        {() => (
                            <>
                                <TestComponent x={1} processOperationId={processOperationId1} />
                                <TestComponent x={2} operationId="test-2" processOperationId={processOperationId2} />
                            </>
                        )}
                    </App>
                </TestProvider>
            );

            yield wait(DELAY * 2);

            expect(operationId1).not.toBe(operationId2);
            expect(processLoading).toHaveBeenCalledTimes(2);
            expect(processLoading.mock.calls).toContainEqual([...ARGS, 1]);
            expect(processLoading.mock.calls).toContainEqual([...ARGS, 2]);

            yield unmount();
            unmountDefer.resolve();
        });
    });

    test('Reload init new load round', async () => {
        const { App, processLoading, processDisposing } = initTest();
        const runner = getSagaRunner();

        const reloadCount = 5;
        const unmountDefer = createDeferred();

        return runner.run(function* ({ TestProvider }) {
            const { unmount } = yield render(
                <TestProvider>
                    <App />
                </TestProvider>
            );

            yield wait(DELAY * 2);

            expect(processDisposing).toHaveBeenCalledTimes(0);
            expect(processLoading).toHaveBeenCalledTimes(1);

            for (let i = 0; i < reloadCount; i++) {
                window.document.getElementById('reload')?.click();
                yield wait(DELAY * 2);
            }

            expect(processDisposing).toHaveBeenCalledTimes(reloadCount);
            expect(processLoading).toHaveBeenCalledTimes(reloadCount + 1);

            yield unmount();
            unmountDefer.resolve();
        });
    });

    test('hash collected from ssr applied', async () => {
        const { App } = initTest();
        const runner = getSagaRunner();

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

        return runner.run(function* ({ TestProvider }) {
            yield* call(componentLifecycleService.run);

            const { unmount } = yield render(
                <TestProvider operationService={operationService} componentLifecycleService={componentLifecycleService}>
                    <App>{x => <TestComponent x={x} />}</App>
                </TestProvider>
            );

            yield wait(DELAY * 2);

            // first load skipped due to ssr
            expect(fn).toHaveBeenCalledTimes(0);

            window.document.getElementById('update')?.click();
            yield wait(DELAY * 2);

            // next load proceed as usual
            expect(fn).toHaveBeenCalledTimes(1);

            yield unmount();
            unmountDefer.resolve();

            yield* call(componentLifecycleService.destroy);
        });
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
