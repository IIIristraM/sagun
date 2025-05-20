import { beforeEach, expect, test, vi } from 'vitest';

import { applyMiddleware, createStore } from 'redux';
import React, { useEffect } from 'react';
import { call } from 'typed-redux-saga';
import createSagaMiddleware from 'redux-saga';
import jsdom from 'jsdom';
import { Provider } from 'react-redux';

import { ComponentLifecycleService, OperationService, Service } from '../../services';
import { daemon, DaemonMode } from '../../decorators';
import { createDeferred } from '../../utils/createDeferred';
import reducer from '../../reducer';
import { Root } from '../../components/Root';
import { useService } from '../useService';

import { render } from '_root/utils';
import { wait } from '_test/';

const sagaMiddleware = createSagaMiddleware();
const store = applyMiddleware(sagaMiddleware)(createStore)(reducer);
const operationService = new OperationService({ hash: {} });
const componentLifecycleService = new ComponentLifecycleService(operationService);

const processLoading = vi.fn((x: string, y: number) => ({}));
const processDisposing = vi.fn(() => ({}));

class TestServiceClass extends Service<[string, number]> {
    toString() {
        return 'TestServiceClass';
    }

    @daemon(DaemonMode.Every)
    *foo() {
        return 1;
    }

    *run(...args: [string, number]) {
        yield* call(processLoading, ...args);
        return yield* call([this, super.run], ...args);
    }

    *destroy(...args: [string, number]) {
        yield* call(processDisposing);
        yield* call([this, super.destroy], ...args);
    }
}

beforeEach(() => {
    processLoading.mockClear();
    processDisposing.mockClear();
});

test('useService runs and destroys service', async () => {
    const { window } = new jsdom.JSDOM(`
        <html>
            <body>
                <div id="app"></div>
            </body>
        </html>
    `);

    (global as any).window = window;
    (global as any).document = window.document;

    const mountDefer = createDeferred();
    const unmountDefer = createDeferred();

    const task = sagaMiddleware.run(function* () {
        yield* call(componentLifecycleService.run);
        yield mountDefer.promise;
        yield unmountDefer.promise;
        yield* call(componentLifecycleService.destroy);
    });

    const TestComponent: React.FC<{}> = () => {
        useService(new TestServiceClass(operationService), ['1', 1]);

        useEffect(() => {
            mountDefer.resolve();
            return () => unmountDefer.resolve();
        }, []);

        return null;
    };

    const { unmount } = await render(
        <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
            <Provider store={store}>
                <TestComponent />
            </Provider>
        </Root>
    );

    await mountDefer.promise;
    await wait(10);
    await unmount();
    await unmountDefer.promise;
    await wait(10);
    task.cancel();

    expect(processLoading).toHaveBeenCalledTimes(1);
    expect(processLoading).toHaveBeenCalledWith('1', 1);
    expect(processDisposing).toHaveBeenCalledTimes(1);
});

test('types are correctly inferred from hook args', () => {
    // @ts-ignore
    function TestComponent() {
        const arg0 = 1;
        const arg1 = '1';
        const args: [string, number] = [arg1, arg0];

        useService(new TestServiceClass(operationService), args);

        useService(new TestServiceClass(operationService), [arg1, arg0]);

        useService(
            new TestServiceClass(operationService),
            // TODO error is preferable
            [arg0, arg1]
        );

        useService<[number, string], void>(
            // @ts-expect-error
            new TestServiceClass(operationService),
            [arg0, arg1]
        );

        useService<[string, number], void>(
            new TestServiceClass(operationService),
            // @ts-expect-error
            [arg0, arg1]
        );

        return null;
    }
});
