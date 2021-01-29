import { applyMiddleware, combineReducers, createStore, Store } from 'redux';
import { GetProps, Provider } from 'react-redux';
import React, { Suspense } from 'react';
import { act } from 'react-dom/test-utils';
import { call } from 'typed-redux-saga';
import createSagaMiddleware from 'redux-saga';
import { ExtractArgs } from '@iiiristram/ts-type-utils';
import jsdom from 'jsdom';
import prettier from 'prettier';
import ReactDOM from 'react-dom';

import {
    asyncOperationsReducer,
    ComponentLifecycleService,
    OperationService,
    Root,
    SagaClientHash,
    useDI,
    useOperation,
    useService,
} from '_lib/';
import { renderToStringAsync } from '_lib/serverRender';

import { api, DELAY } from './TestAPI';
import Content from './components/Content';
import { isolate } from '../utils';
import Table from './components/Table';
import { TestService } from './TestService';
import UserInfo from './components/UserInfo';

type AppStore = {
    asyncOperations: ReturnType<typeof asyncOperationsReducer>;
};

useOperation.setPath((state: AppStore) => state.asyncOperations);

function load<T extends React.ComponentType<any>>(promise: () => Promise<{ default: T }>) {
    let Component: T | undefined;
    let innerPromise: Promise<void>;

    return function LoadComponent(props: ExtractArgs<T>[0]) {
        if (!innerPromise) {
            innerPromise = new Promise<void>(resolve => {
                promise().then(res => {
                    Component = res.default;
                    resolve();
                });
            });

            throw innerPromise;
        }

        return Component ? <Component {...props} /> : null;
    };
}

function buildStore(initialState?: AppStore) {
    const sagaMiddleware = createSagaMiddleware();
    const store = applyMiddleware(sagaMiddleware)(createStore)(
        combineReducers({
            asyncOperations: asyncOperationsReducer,
        }),
        initialState
    );

    return { store, sagaMiddleware };
}

function Layout({ children }: { children?: React.ReactNode }) {
    const context = useDI();
    const service = context.createService(TestService);
    context.registerService(service);
    useService(service);

    return <div>{children}</div>;
}

function App({
    store,
    children,
    service,
    operationService,
}: {
    store: Store<AppStore>;
    children?: React.ReactNode;
    service: ComponentLifecycleService;
    operationService: OperationService;
}) {
    return (
        <Root operationService={operationService} componentLifecycleService={service}>
            <Provider store={store}>
                <Layout>
                    <Suspense fallback="">{children}</Suspense>
                </Layout>
            </Provider>
        </Root>
    );
}

// const originError = console.error;

async function nodeRender(renderApp: ({ store }: GetProps<typeof App>) => JSX.Element) {
    const { store, sagaMiddleware } = buildStore();
    const operationService = new OperationService({ hash: {} });
    const service = new ComponentLifecycleService(operationService);

    const task = sagaMiddleware.run(function* () {
        yield* call(service.run);
    });

    const html = await renderToStringAsync(renderApp({ store, service, operationService }));

    task.cancel();
    await task.toPromise();

    return { html, hash: operationService.getHash(), store };
}

async function clientRender(
    renderApp: ({ store }: GetProps<typeof App>) => JSX.Element,
    html: string,
    state: AppStore,
    hash: SagaClientHash
) {
    const { store, sagaMiddleware } = buildStore(state);
    const { window } = new jsdom.JSDOM(`
        <html>
            <body>
                <div id="app">${html}</div>
            </body>
        </html>
    `);

    (global as any).window = window;
    const operationService = new OperationService({ hash });
    const service = new ComponentLifecycleService(operationService);

    const task = sagaMiddleware.run(function* () {
        yield* call(operationService.run);
        yield* call(service.run);
    });

    const appEl = window.document.getElementById('app');

    await act(async () => {
        ReactDOM.hydrate(
            renderApp({
                store,
                service,
                operationService,
            }),
            appEl,
            () => {
                // handle hydration warnings
                // expect(console.error).toHaveBeenCalledTimes(0);
            }
        );
    });

    jest.useFakeTimers();
    const maxRequests = 4;
    for (let steps = 0; steps < maxRequests; steps++) {
        await act(async () => {
            jest.advanceTimersByTime(DELAY + 1);
        });
    }
    jest.useRealTimers();

    task.cancel();
    await task.toPromise();

    console.log(
        prettier.format(window.document.documentElement.outerHTML, {
            parser: 'html',
            htmlWhitespaceSensitivity: 'ignore',
        })
    );
}

afterEach(() => {
    (global as any).window = undefined;
    // console.error = originError;
    jest.clearAllMocks();
});

test('sync independent sagas', async () => {
    return isolate(async () => {
        const Header = require('./components/Header').default;

        const renderApp = ({ store, service, operationService }: GetProps<typeof App>) => (
            <App store={store} service={service} operationService={operationService}>
                <Header>
                    <UserInfo id="" fallback="" />
                </Header>
                <Content>
                    <Table fallback="" />
                </Content>
            </App>
        );

        const { hash, store, html } = await nodeRender(renderApp);
        expect(api.getUser).toHaveBeenCalledTimes(1);
        expect(api.getList).toHaveBeenCalledTimes(1);

        // console.error = jest.fn(originError);

        await clientRender(renderApp, html, store.getState(), hash);
        expect(api.getUser).toHaveBeenCalledTimes(1);
        expect(api.getList).toHaveBeenCalledTimes(1);
        expect(global.window.document.getElementsByClassName('user').length).toBe(1);
        expect(global.window.document.getElementsByClassName('table-item').length).toBe(5);
    });
});

test('async independent sagas', async () => {
    return isolate(async () => {
        const HeaderAsync = load(() => import('./components/Header'));

        const renderApp = ({ store, service, operationService }: GetProps<typeof App>) => (
            <App store={store} service={service} operationService={operationService}>
                <HeaderAsync>
                    <UserInfo id="" fallback="" />
                </HeaderAsync>
                <Content>
                    <Table fallback="" />
                </Content>
            </App>
        );

        const { hash, store, html } = await nodeRender(renderApp);
        expect(api.getUser).toHaveBeenCalledTimes(1);
        expect(api.getList).toHaveBeenCalledTimes(1);

        // console.error = jest.fn(originError);

        await clientRender(renderApp, html, store.getState(), hash);
        expect(api.getUser).toHaveBeenCalledTimes(1);
        expect(api.getList).toHaveBeenCalledTimes(1);
        expect(global.window.document.getElementsByClassName('user').length).toBe(1);
        expect(global.window.document.getElementsByClassName('table-item').length).toBe(5);
    });
});

test('async dependent sagas', async () => {
    return isolate(async () => {
        const HeaderAsync = load(() => import('./components/Header'));
        const UserDetailsAsync = load(() => import('./components/UserDetails'));

        const renderApp = ({ store, service, operationService }: GetProps<typeof App>) => (
            <App store={store} service={service} operationService={operationService}>
                <HeaderAsync>
                    <UserInfo id="1" fallback="">
                        <UserDetailsAsync id="1" />
                    </UserInfo>
                </HeaderAsync>
                <Content>
                    <Table fallback="" />
                </Content>
            </App>
        );

        const { hash, html, store } = await nodeRender(renderApp);
        expect(api.getUser).toHaveBeenCalledTimes(1);
        expect(api.getList).toHaveBeenCalledTimes(1);
        expect(api.getUserDetails).toHaveBeenCalledTimes(1);

        // console.error = jest.fn(originError);

        await clientRender(renderApp, html, store.getState(), hash);
        expect(api.getUser).toHaveBeenCalledTimes(1);
        expect(api.getList).toHaveBeenCalledTimes(1);
        expect(api.getUserDetails).toHaveBeenCalledTimes(1);
        expect(global.window.document.getElementsByClassName('user').length).toBe(1);
        expect(global.window.document.getElementsByClassName('table-item').length).toBe(5);
        expect(global.window.document.getElementsByClassName('card').length).toBe(1);
        expect(global.window.document.getElementsByClassName('card')?.[0].innerHTML).toBe('**00');
    });
});

test('async dependent siblings', async () => {
    return isolate(async () => {
        const HeaderAsync = load(() => import('./components/Header'));

        const UserDetailsAsync = load(() => import('./components/UserDetails'));

        const renderApp = ({ store, service, operationService }: GetProps<typeof App>) => (
            <App store={store} service={service} operationService={operationService}>
                <UserDetailsAsync id="1" />
                <HeaderAsync>
                    <UserInfo id="1" fallback="" />
                </HeaderAsync>
                <Content>
                    <Table fallback="" />
                </Content>
            </App>
        );

        const { hash, store, html } = await nodeRender(renderApp);
        expect(api.getUser).toHaveBeenCalledTimes(1);
        expect(api.getList).toHaveBeenCalledTimes(1);
        expect(api.getUserDetails).toHaveBeenCalledTimes(1);

        // console.error = jest.fn(originError);

        await clientRender(renderApp, html, store.getState(), hash);
        expect(api.getUser).toHaveBeenCalledTimes(1);
        expect(api.getList).toHaveBeenCalledTimes(1);
        expect(api.getUserDetails).toHaveBeenCalledTimes(1);
        expect(global.window.document.getElementsByClassName('user').length).toBe(1);
        expect(global.window.document.getElementsByClassName('table-item').length).toBe(5);
        expect(global.window.document.getElementsByClassName('card').length).toBe(1);
        expect(global.window.document.getElementsByClassName('card')?.[0].innerHTML).toBe('**00');
    });
});

test('multiple component instances', async () => {
    return isolate(async () => {
        const HeaderAsync = load(() => import('./components/Header'));
        const UserDetailsAsync = require('./components/UserDetails').default;

        const renderApp = ({ store, service, operationService }: GetProps<typeof App>) => (
            <App store={store} service={service} operationService={operationService}>
                <HeaderAsync>
                    <UserInfo id="1" fallback="">
                        <UserDetailsAsync id="1" />
                    </UserInfo>
                    <UserInfo id="2" fallback="">
                        <UserDetailsAsync id="2" />
                    </UserInfo>
                </HeaderAsync>
            </App>
        );

        const { hash, store, html } = await nodeRender(renderApp);
        expect(api.getUser).toHaveBeenCalledTimes(2);
        expect(api.getUserDetails).toHaveBeenCalledTimes(2);

        // console.error = jest.fn(originError);

        await clientRender(renderApp, html, store.getState(), hash);
        expect(api.getUser).toHaveBeenCalledTimes(2);
        expect(api.getUserDetails).toHaveBeenCalledTimes(2);
        expect(global.window.document.getElementsByClassName('card').length).toBe(2);
        expect(global.window.document.getElementsByClassName('card')?.[0].innerHTML).toBe('**00');
        expect(global.window.document.getElementsByClassName('card')?.[1].innerHTML).toBe('**00');
    });
});
