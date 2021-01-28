/**
 * @jest-environment jsdom
 */

import { applyMiddleware, createStore } from 'redux';
import { call, select } from 'typed-redux-saga';
import React, { useEffect, useState } from 'react';
import createSagaMiddleware from 'redux-saga';
import jsdom from 'jsdom';
import { Provider } from 'react-redux';
import ReactDOM from 'react-dom';

import { ComponentLifecycleService, Service } from '../../services';
import { createDeferred } from '../../utils/createDeferred';
import { operation } from '../../decorators';
import { OperationId } from '../../types';
import { OperationService } from '../../services';
import reducer from '../../reducer';
import { Root } from '../../components/Root';
import { useSaga } from '../useSaga';

import { delay } from '_test/utils';

type Props = {
    operationService: OperationService;
    componentLifecycleService: ComponentLifecycleService;
    processOperationId?: (operationId: string) => void;
    onUpdate?: Function;
    onUnmount?: Function;
    children?: (x: number) => JSX.Element;
};

const sagaMiddleware = createSagaMiddleware();
const store = applyMiddleware(sagaMiddleware)(createStore)(reducer);

type TestState = ReturnType<typeof store.getState>;
const processLoading = jest.fn((...args: any[]) => ({}));
const processDisposing = jest.fn((...args: any[]) => ({}));
const ARGS = ['xxx'];

const onLoad = function* (...args: [string, number]) {
    processLoading(...args);
};

const onDispose = function* (...args: [string, number]) {
    processDisposing(...args);
};

const TestComponent: React.FC<Pick<Props, 'processOperationId'> & { x: number }> = ({ x, processOperationId }) => {
    const { operationId, reload } = useSaga({ onLoad, onDispose }, [...ARGS, x]);

    if (processOperationId) {
        processOperationId(operationId);
    }

    return <button id="reload" onClick={reload} />;
};

const App: React.FC<Props> = ({
    processOperationId,
    operationService,
    componentLifecycleService,
    onUpdate,
    onUnmount,
    children,
}) => {
    const [x, setX] = useState(0);

    useEffect(() => {
        onUpdate?.();
    });

    useEffect(() => {
        return () => onUnmount?.();
    }, []);

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

describe('useSaga', () => {
    beforeEach(() => {
        processLoading.mockClear();
        processDisposing.mockClear();
    });

    test('Saga methods were invoked with proper args', async () => {
        const operationService = new OperationService({ hash: {} });
        const componentLifecycleService = new ComponentLifecycleService(operationService);

        const { window } = new jsdom.JSDOM(`
            <html>
                <body>
                    <div id="app"></div>
                </body>
            </html>
        `);

        const appEl = window.document.getElementById('app')!;
        let updateDefer = createDeferred();
        const unmountDefer = createDeferred();

        const task = sagaMiddleware.run(function* () {
            yield* call(componentLifecycleService.run);
            yield updateDefer.promise;
            yield updateDefer.promise;
            yield unmountDefer.promise;
            yield* call(componentLifecycleService.destroy);
        });

        const onUpdate = () => {
            updateDefer.resolve();
            updateDefer = createDeferred();
        };

        const onUnmount = () => unmountDefer.resolve();

        ReactDOM.render(
            <App
                operationService={operationService}
                componentLifecycleService={componentLifecycleService}
                onUpdate={onUpdate}
                onUnmount={onUnmount}
            />,
            appEl
        );

        await updateDefer.promise;
        window.document.getElementById('update')?.click();
        await updateDefer.promise;
        ReactDOM.unmountComponentAtNode(appEl);
        await unmountDefer.promise;
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
        const operationService = new OperationService({ hash: {} });
        const componentLifecycleService = new ComponentLifecycleService(operationService);

        const { window } = new jsdom.JSDOM(`
            <html>
                <body>
                    <div id="app"></div>
                </body>
            </html>
        `);

        const appEl = window.document.getElementById('app')!;
        let updateDefer = createDeferred();
        const unmountDefer = createDeferred();
        let operationId: string;
        const processOperationId = (id: string) => (operationId = id);

        const task = sagaMiddleware.run(function* () {
            yield* call(componentLifecycleService.run);
            yield updateDefer.promise;
            let operation = yield* select((state: TestState) => state[operationId]);
            expect(operation).toBeTruthy();
            yield unmountDefer.promise;
            operation = yield* select((state: TestState) => state[operationId]);
            expect(operation).toBeFalsy();
            yield call(componentLifecycleService.destroy);
        });

        const onUpdate = () => {
            updateDefer.resolve();
            updateDefer = createDeferred();
        };

        const onUnmount = () => unmountDefer.resolve();

        ReactDOM.render(
            <App
                operationService={operationService}
                componentLifecycleService={componentLifecycleService}
                onUpdate={onUpdate}
                onUnmount={onUnmount}
                processOperationId={processOperationId}
            />,
            appEl
        );

        await updateDefer.promise;
        ReactDOM.unmountComponentAtNode(appEl);
        await unmountDefer.promise;
        task.cancel();
        await task.toPromise();
    });

    test("Each Component runs it's own operation", async () => {
        const operationService = new OperationService({ hash: {} });
        const componentLifecycleService = new ComponentLifecycleService(operationService);

        const { window } = new jsdom.JSDOM(`
            <html>
                <body>
                    <div id="app"></div>
                </body>
            </html>
        `);

        const appEl = window.document.getElementById('app')!;
        let updateDefer = createDeferred();
        const unmountDefer = createDeferred();
        let operationId1 = '_init';
        let operationId2 = '_init';
        const processOperationId1 = (id: string) => (operationId1 = id);
        const processOperationId2 = (id: string) => (operationId2 = id);

        const onUpdate = () => {
            updateDefer.resolve();
            updateDefer = createDeferred();
        };

        const onUnmount = () => unmountDefer.resolve();

        const task = sagaMiddleware.run(function* () {
            yield* call(componentLifecycleService.run);
            yield updateDefer.promise;
            expect(operationId1).not.toBe(operationId2);
            expect(processLoading).toHaveBeenCalledTimes(2);
            expect(processLoading).toHaveBeenNthCalledWith(1, ...ARGS, 1);
            expect(processLoading).toHaveBeenNthCalledWith(2, ...ARGS, 2);
            yield unmountDefer.promise;
            yield* call(componentLifecycleService.destroy);
        });

        ReactDOM.render(
            <App
                onUpdate={onUpdate}
                onUnmount={onUnmount}
                operationService={operationService}
                componentLifecycleService={componentLifecycleService}>
                {() => (
                    <>
                        <TestComponent x={1} processOperationId={processOperationId1} />
                        <TestComponent x={2} processOperationId={processOperationId2} />
                    </>
                )}
            </App>,
            appEl
        );

        await updateDefer.promise;
        ReactDOM.unmountComponentAtNode(appEl);
        await unmountDefer.promise;
        task.cancel();
        await task.toPromise();
    });

    test('Reload init new load round', async () => {
        const operationService = new OperationService({ hash: {} });
        const componentLifecycleService = new ComponentLifecycleService(operationService);

        const { window } = new jsdom.JSDOM(`
            <html>
                <body>
                    <div id="app"></div>
                </body>
            </html>
        `);

        const reloadCount = 20;
        const appEl = window.document.getElementById('app')!;
        let updateDefer = createDeferred();
        const unmountDefer = createDeferred();
        const onUpdate = () => {
            updateDefer.resolve();
            updateDefer = createDeferred();
        };

        const onUnmount = () => unmountDefer.resolve();

        const task = sagaMiddleware.run(function* () {
            yield* call(componentLifecycleService.run);
            yield updateDefer.promise;

            expect(processLoading).toHaveBeenCalledTimes(1);
            expect(processDisposing).toHaveBeenCalledTimes(0);

            for (let i = 0; i < reloadCount; i++) {
                window.document.getElementById('reload')?.click();
            }

            window.document.getElementById('update')?.click();
            yield updateDefer.promise;

            // +1 - "update" button click
            expect(processDisposing).toHaveBeenCalledTimes(reloadCount + 1);
            // +1 - first load, +1 - "update" button click
            expect(processLoading).toHaveBeenCalledTimes(reloadCount + 2);

            yield unmountDefer.promise;
            yield* call(componentLifecycleService.destroy);
        });

        ReactDOM.render(
            <App
                operationService={operationService}
                componentLifecycleService={componentLifecycleService}
                onUpdate={onUpdate}
                onUnmount={onUnmount}
            />,
            appEl
        );

        await updateDefer.promise;
        await updateDefer.promise;
        ReactDOM.unmountComponentAtNode(appEl);
        await unmountDefer.promise;
        task.cancel();
        await task.toPromise();
    });

    test('hash collected from ssr applied', async () => {
        const fn = jest.fn(() => {});
        const id = 'test_id' as OperationId<void>;
        class TestService extends Service {
            toString() {
                return 'TestService';
            }

            @operation(id)
            *method() {
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
            useSaga({ onLoad: service.method }, [x]);
            return null;
        };

        const { window } = new jsdom.JSDOM(`
            <html>
                <body>
                    <div id="app"></div>
                </body>
            </html>
        `);

        const appEl = window.document.getElementById('app')!;
        const updateDefer1 = createDeferred();
        const updateDefer2 = createDeferred();
        const unmountDefer = createDeferred();

        const task = sagaMiddleware.run(function* () {
            yield* call(componentLifecycleService.run);
            yield updateDefer1.promise;
            // first load skipped due to ssr
            expect(fn).toHaveBeenCalledTimes(0);

            yield updateDefer2.promise;
            // next load proceed as usual
            expect(fn).toHaveBeenCalledTimes(1);

            yield unmountDefer.promise;

            yield* call(componentLifecycleService.destroy);
        });

        ReactDOM.render(
            <App operationService={operationService} componentLifecycleService={componentLifecycleService}>
                {x => <TestComponent x={x} />}
            </App>,
            appEl
        );

        await delay(100);
        updateDefer1.resolve();

        window.document.getElementById('update')?.click();
        await delay(100);
        updateDefer2.resolve();

        ReactDOM.unmountComponentAtNode(appEl);
        await delay(100);

        task.cancel();
        await task.toPromise();
    });
});
