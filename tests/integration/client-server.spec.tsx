import { applyMiddleware, combineReducers, createStore, Store } from 'redux';
import { GetProps, Provider } from 'react-redux';
import React, { Suspense } from 'react';
import { call } from 'typed-redux-saga';
import createSagaMiddleware from 'redux-saga';
import jsdom from 'jsdom';
import prettier from 'prettier';
import { renderToStringAsync } from '_lib/serverRender';

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

import { api, DELAY } from './TestAPI';
import { hydrate, resource, wait } from '../utils';
import Content from './components/Content';
import Table from './components/Table';
import { TestService } from './TestService';
import UserInfo from './components/UserInfo';

type AppStore = {
    asyncOperations: ReturnType<typeof asyncOperationsReducer>;
};

useOperation.setPath((state: AppStore) => state.asyncOperations);

function load<T extends React.FC<any>>(promise: () => Promise<{ default: T }>) {
    let Component: T | undefined;
    let innerPromise: Promise<void>;

    return function LoadComponent(props: Parameters<T>[0]) {
        if (!innerPromise || !Component) {
            innerPromise =
                innerPromise ||
                new Promise<void>(resolve => {
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
                <Suspense fallback="">
                    <Layout>{children}</Layout>
                </Suspense>
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
    hash?: SagaClientHash
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
    (global as any).document = window.document;
    const operationService = new OperationService({ hash });
    const service = new ComponentLifecycleService(operationService);

    const task = sagaMiddleware.run(function* () {
        yield* call(operationService.run);
        yield* call(service.run);
    });

    hydrate(
        renderApp({
            store,
            service,
            operationService,
        })
    );

    const maxRequests = 4;
    for (let steps = 0; steps < maxRequests; steps++) {
        await wait(DELAY * 2);
    }

    task.cancel();
    await task.toPromise();

    console.log(
        await prettier.format(window.document.documentElement.outerHTML, {
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
    let Header: any;
    jest.isolateModules(() => {
        Header = require('./components/Header').default;
    });

    const renderApp = ({ store, service, operationService }: GetProps<typeof App>) => (
        <App store={store} service={service} operationService={operationService}>
            <Header>
                <Suspense fallback="">
                    <UserInfo id="" />
                </Suspense>
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

test('async independent sagas', async () => {
    let HeaderAsync: any;
    jest.isolateModules(() => {
        HeaderAsync = load(() => import('./components/Header'));
    });

    const renderApp = ({ store, service, operationService }: GetProps<typeof App>) => (
        <App store={store} service={service} operationService={operationService}>
            <HeaderAsync>
                <Suspense fallback="">
                    <UserInfo id="" />
                </Suspense>
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

test('async dependent sagas', async () => {
    let HeaderAsync: any;
    let UserDetailsAsync: any;
    jest.isolateModules(() => {
        HeaderAsync = load(() => import('./components/Header'));
        UserDetailsAsync = load(() => import('./components/UserDetails'));
    });

    const renderApp = ({ store, service, operationService }: GetProps<typeof App>) => (
        <App store={store} service={service} operationService={operationService}>
            <HeaderAsync>
                <Suspense fallback="">
                    <UserInfo id="1">
                        <UserDetailsAsync id="1" />
                    </UserInfo>
                </Suspense>
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

test('async dependent siblings', async () => {
    let HeaderAsync: any;
    let UserDetailsAsync: any;
    jest.isolateModules(() => {
        HeaderAsync = load(() => import('./components/Header'));
        UserDetailsAsync = load(() => import('./components/UserDetails'));
    });

    const renderApp = ({ store, service, operationService }: GetProps<typeof App>) => (
        <App store={store} service={service} operationService={operationService}>
            <UserDetailsAsync id="1" />
            <HeaderAsync>
                <Suspense fallback="">
                    <UserInfo id="1" />
                </Suspense>
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

test('multiple component instances', async () => {
    let HeaderAsync: any;
    let UserDetailsAsync: any;
    jest.isolateModules(() => {
        HeaderAsync = load(() => import('./components/Header'));
        UserDetailsAsync = load(() => import('./components/UserDetails'));
    });

    const renderApp = ({ store, service, operationService }: GetProps<typeof App>) => (
        <App store={store} service={service} operationService={operationService}>
            <HeaderAsync>
                <Suspense fallback="">
                    <UserInfo id="1">
                        <UserDetailsAsync id="1" />
                    </UserInfo>
                </Suspense>
                <Suspense fallback="">
                    <UserInfo id="2">
                        <UserDetailsAsync id="2" />
                    </UserInfo>
                </Suspense>
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

test('fragments', async () => {
    let r1 = resource();

    const C1 = ({ className }: { className: string }) => {
        const res = r1.read();
        return <div className={className}>{res}</div>;
    };

    const App = () => (
        <div>
            <Suspense fallback="">
                <>
                    <C1 className="1" />
                </>
                <>
                    <div />
                </>
            </Suspense>
        </div>
    );

    const html = await renderToStringAsync(<App />);

    const { window } = new jsdom.JSDOM(`
            <html>
                <body>
                    <div id="app">${html}</div>
                </body>
            </html>
        `);

    (global as any).window = window;
    (global as any).document = window.document;

    r1 = resource();
    hydrate(<App />);

    await wait(50);

    console.log(html);
    console.log(window.document.getElementById('app')?.innerHTML);
    // this is actually a bug for React 16, seems like sibling fragments renders wrong inside Suspense
    // does not reproduce in React 17
    const [major] = React.version.split('.');
    expect(global.window.document.getElementsByClassName('1').length).toBe(major === '16' ? 2 : 1);
});
