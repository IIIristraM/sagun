import { applyMiddleware, combineReducers, createStore } from 'redux';
import { Provider, useSelector } from 'react-redux';
import createSagaMiddleware from 'redux-saga';
import React, { memo, Suspense, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import {
    ComponentLifecycleService,
    OperationService,
    asyncOperationsReducer,
    Root,
    useOperation,
    useSaga,
    Operation,
    Service,
    operation,
    useService,
    useDI,
    useServiceConsumer,
    getId,
} from '../src';
import { all, call, delay } from 'typed-redux-saga';

let i = 0;
const sagaMiddleware = createSagaMiddleware();

const DELAY = 2000;

class AppService extends Service {
    toString(): string {
        return 'AppService';
    }

    @operation
    *foo() {
        yield* delay(DELAY);
        console.log('foo');
    }

    @operation
    *baz() {
        yield* delay(DELAY);
        console.log('baz');
    }

    @operation
    *auth() {
        yield* delay(DELAY);
        console.log('auth');
    }
}

function root(state: any = {}, action: any) {
    console.log('ACTION', action);
    const { asyncOperations, ...rest } = state;

    const nextOperations = asyncOperationsReducer(asyncOperations, action);

    if (nextOperations === state.asyncOperations) {
        return state;
    }

    return {
        asyncOperations: nextOperations,
    };
}

const store = applyMiddleware(sagaMiddleware)(createStore)(root);

// ------------------
useOperation.setPath(state => state.asyncOperations);
const operationService = new OperationService();
const componentLifecycleService = new ComponentLifecycleService(operationService);

sagaMiddleware.run(function* () {
    yield* call(operationService.run);
    yield* call(componentLifecycleService.run);
});
// ------------------

ReactDOM.render(
    // ------------------
    <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
        <Provider store={store}>
            <Suspense fallback="Loading...">
                <Wrapper />
            </Suspense>
        </Provider>
    </Root>,
    // ------------------
    document.getElementById('app')!
);

function UpdateAlways() {
    const result = useSelector(state => {
        console.log('UpdateAlways Selector');
        return [];
    });

    console.log('Render UpdateAlways');
    useEffect(() => {
        console.log('Commit UpdateAlways');
    });

    return <div>Update {result}</div>;
}

const Updater = memo(function Updater() {
    const { service } = useServiceConsumer(AppService);

    console.log('Render Updater');
    useEffect(() => {
        console.log('Commit Updater');
    });

    const op1 = useOperation({ operationId: getId(service.foo) });
    const op2 = useOperation({ operationId: getId(service.baz) });

    if (op1.isLoading || op2.isLoading) return <div />;

    return <Inner />;
});

function Inner() {
    const { service } = useServiceConsumer(AppService);
    console.log('Render Inner');
    useEffect(() => {
        console.log('Commit Inner');
    });

    useSaga({
        id: 'inner',
        onLoad: function* () {
            console.log('Inner onLoad');
        },
    });

    return <div>Inner</div>;
}

function Wrapper() {
    const di = useDI();
    const service = di.createService(AppService);
    di.registerService(service);

    const { operationId } = useSaga({
        id: 'wrapper',
        onLoad: function* () {
            console.log("Wrapper onLoad")
            yield* call(service.run);
            yield* call(service.auth);
            return 1;
        },
    });

    return (
        <Suspense fallback="Wrapper loading...">
            <Operation operationId={operationId}>{() => <App />}</Operation>
        </Suspense>
    );
}

function App() {
    console.log('RENDER APP');
    const {service} = useServiceConsumer(AppService)
    
    useOperation({operationId: getId(service.auth)});

    useSaga({
        id: "init-app",
        onLoad: function* () {
            console.log("App onLoad")
            yield* call(service.foo);
            yield* call(service.baz);
        }
    });

    return (
        <Suspense fallback="App loading...">
            <Operation operationId={getId(service.foo)}>
                {() => (
                    <>
                        <UpdateAlways />
                        <Updater />
                    </>
                )}
            </Operation>
        </Suspense>
    );

    // const [state, setState] = useState(0);

    // useEffect(() => {
    //     setState(1)
    // }, [])

    // return (
    //     <>
    //         <Content1 />
    //         {!!state && <Content2 />}
    //     </>
    // )
}

function Content1() {
    console.log('Content1 render');

    useEffect(() => {
        console.log('Content1 commit');
    });

    useSelector(() => {
        console.log('Content1 selector');
        return [];
    });

    return null;
}

function Content2() {
    console.log('Content2 render');

    useEffect(() => {
        console.log('Content2 commit');
    });

    useSaga({
        id: 'content-2',
        onLoad: function* () {},
    });

    return null;
}
