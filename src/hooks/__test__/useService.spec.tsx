/**
 * @jest-environment jsdom
 */
import { applyMiddleware, createStore } from 'redux';
import React, { useEffect } from 'react';
import { call } from 'typed-redux-saga';
import createSagaMiddleware from 'redux-saga';
import jsdom from 'jsdom';
import { Provider } from 'react-redux';
import ReactDOM from 'react-dom';

import { ComponentLifecycleService, OperationService, Service } from '../../services';
import { daemon, DaemonMode } from '../../decorators';
import { createDeferred } from '../../utils/createDeferred';
import reducer from '../../reducer';
import { Root } from '../../components/Root';
import { useService } from '../useService';

const sagaMiddleware = createSagaMiddleware();
const store = applyMiddleware(sagaMiddleware)(createStore)(reducer);
const operationService = new OperationService({ hash: {} });
const componentLifecycleService = new ComponentLifecycleService(operationService);

const processLoading = jest.fn((x: string) => ({}));
const processDisposing = jest.fn(() => ({}));

class TestServiceClass extends Service<[string]> {
    toString() {
        return 'TestServiceClass';
    }

    @daemon(DaemonMode.Every)
    public *foo() {
        return 1;
    }

    public *run(...args: [string]) {
        yield call(processLoading, ...args);
        return yield call([this, super.run], ...args);
    }

    public *destroy(...args: [string]) {
        yield call(processDisposing);
        yield call([this, super.destroy], ...args);
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

    const appEl = window.document.getElementById('app')!;
    const mountDefer = createDeferred();
    const unmountDefer = createDeferred();

    const task = sagaMiddleware.run(function* () {
        yield* call(componentLifecycleService.run);
        yield mountDefer.promise;
        yield unmountDefer.promise;
        yield* call(componentLifecycleService.destroy);
    });

    const TestComponent: React.FC<{}> = () => {
        useService(new TestServiceClass(operationService), ['1']);

        useEffect(() => {
            mountDefer.resolve();
            return () => unmountDefer.resolve();
        }, []);

        return null;
    };

    ReactDOM.render(
        <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
            <Provider store={store}>
                <TestComponent />
            </Provider>
        </Root>,
        appEl
    );

    await mountDefer.promise;
    ReactDOM.unmountComponentAtNode(appEl);
    await unmountDefer.promise;
    task.cancel();

    expect(processLoading).toHaveBeenCalledTimes(1);
    expect(processLoading).toHaveBeenCalledWith('1');
    expect(processDisposing).toHaveBeenCalledTimes(1);
});
