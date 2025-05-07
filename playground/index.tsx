import { applyMiddleware, createStore, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';
import React, { memo, Suspense, useContext, useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
// import ReactDOM from "react-dom";
import {
    ComponentLifecycleService,
    OperationService,
    asyncOperationsReducer,
    Root,
    useOperation,
    Service,
    operation,
    useDI,
    useService,
    Operation,
    useSaga,
    useServiceConsumer,
    getId,
    createDeferred,
} from '../src';
import { call, delay } from 'typed-redux-saga';
import { UUIDGenerator } from '../src/services/UUIDGenerator';

const DELAY = 5000;

const sagaMiddleware = createSagaMiddleware();
const store = applyMiddleware(sagaMiddleware)(createStore)(
    combineReducers({
        asyncOperations: asyncOperationsReducer,
    })
);

useOperation.setPath(state => state.asyncOperations);
const operationService = new OperationService();
const componentLifecycleService = new ComponentLifecycleService(operationService);

sagaMiddleware.run(function* () {
    yield* call(operationService.run);
    yield* call(componentLifecycleService.run);
});

class AppService extends Service {
    toString(): string {
        return 'AppService';
    }

    @operation
    *loadContent(counter: number) {
        yield* delay(DELAY);
        return counter;
    }

    *run() {
        yield call([this, super.run]);
        yield* delay(DELAY);
    }
}

const Context = React.createContext<{
    counter: () => number;
    resolve: () => void;
} | null>(null);

const OperationWaiter: React.FC<{ operationId: any; setState: (x: number) => void }> = memo(
    ({ operationId, setState }) => {
        const context = useContext(Context);

        const operation = useOperation({
            operationId: operationId,
            suspense: true,
        });

        useEffect(function mutation() {
            context?.resolve();
            console.log('OP', operation.result);
        });

        useEffect(() => {
            if (context && context.counter() < 3) {
                console.info('setState');
                setState(context.counter());
            }
        }, [context?.counter()]);

        return <div>{operation.result as any}</div>;
    }
);

const InnerComponent: React.FC<{}> = () => {
    const context = useContext(Context);
    const { service: testService } = useServiceConsumer(AppService);
    const [state, setState] = useState(context?.counter());

    console.log('InnerComponent');

    const { operationId } = useSaga(
        'test-id',
        {
            onLoad: testService.loadContent,
        },
        [state]
    );

    return <OperationWaiter operationId={operationId} setState={setState} />;
};

const InnerComponent2: React.FC<{}> = () => {
    const di = useDI();
    const { service: testService } = useServiceConsumer(AppService);
    // const uuidGen = di.getService(UUIDGenerator);

    const { operationId } = useSaga(
        'test-id-2',
        {
            onLoad: testService.loadContent,
        },
        [3]
    );

    const { result } = useOperation({
        operationId,
        suspense: true,
    });

    // console.log('InnerComponent2', 'id_' + uuidGen.uuid());
    return <div>{result}</div>;
};

const TestComponent: React.FC<{}> = () => {
    const di = useDI();
    const appService = di.createService(AppService);
    di.registerService(appService);

    const uuidGen = di.getService(UUIDGenerator);
    useMemo(() => {
        console.log('RESET UUID');
        uuidGen.reset();
    }, []);

    const { operationId } = useService(appService);

    return (
        <>
            <Operation operationId={operationId}>{() => <InnerComponent />}</Operation>
            <InnerComponent2 />
        </>
    );
};

function App() {
    const defer = [createDeferred<unknown>(), createDeferred<unknown>(), createDeferred<unknown>()];
    let counter = 0;

    return (
        <Context.Provider
            value={{
                counter: () => counter,
                resolve: () => defer[counter++].resolve(),
            }}
        >
            <Suspense fallback="Loading...">
                <TestComponent />
            </Suspense>
        </Context.Provider>
    );
}

const root = ReactDOM.createRoot(document.getElementById('app')!, {
    // onUncaughtError: (error, errorInfo) => {
    // console.error("onUncaughtError", error, errorInfo)
    // },
    // onCaughtError: (error, errorInfo) => {
    // console.error("onCaughtError", error, errorInfo)
    // }
});

root.render(
    <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
        <Provider store={store}>
            <App />
        </Provider>
    </Root>
);

// ReactDOM.render(
//     <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
//         <Provider store={store}>
//             <App />
//         </Provider>
//     </Root>,
//     document.getElementById('app')!
// );
