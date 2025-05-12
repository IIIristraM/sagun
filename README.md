# sagun

Strongly-typed service-based isomorphic architecture on top of redux-saga

Currently compatible only with typescript codebase with following options enabled

```json
{
    "compilerOptions": {
        "experimentalDecorators": true
    }
}
```

- [sagun](#sagun)
  - [Core concepts](#core-concepts)
  - [Install](#install)
  - [Get started](#get-started)
  - [API](#api)
    - [Operations](#operations)
    - [Services](#services)
      - [1. Basics](#1-basics)
      - [2. Save results to store](#2-save-results-to-store)
      - [3. Provide redux action for service method](#3-provide-redux-action-for-service-method)
      - [4. Dependency injection](#4-dependency-injection)
      - [5. Custom initialization and cleanup](#5-custom-initialization-and-cleanup)
      - [6. Full service description](#6-full-service-description)
    - [Decorators](#decorators)
      - [1. operation](#1-operation)
      - [2. daemon](#2-daemon)
      - [3. inject](#3-inject)
    - [Hooks](#hooks)
      - [1. useSaga](#1-usesaga)
      - [2. useService](#2-useservice)
      - [3. useServiceConsumer](#3-useserviceconsumer)
      - [4. useOperation](#4-useoperation)
      - [4. useDI](#4-usedi)
    - [Components](#components)
      - [1. Root](#1-root)
      - [2. Operation](#2-operation)
    - [Contexts](#contexts)
      - [1. DIContext](#1-dicontext)
      - [2. DisableSsrContext](#2-disablessrcontext)
    - [HoC](#hoc)
      - [1. withSaga](#1-withsaga)
      - [2. withService](#2-withservice)
    - [SSR](#ssr)

## Core concepts

1. Keep business logic decoupled from components
2. Split your business logic into small services
3. Reduce redux boilerplate, library provides the only reducer you need, and all actions are auto-generated
4. SSR compatible without logic duplicating
5. Dependency injection
6. Fully written in typescript

## Install

peer dependencies:

`npm i --save react react-dom redux react-redux redux-saga immutable`

lib install

`npm i --save @iiiristram/sagun`

recommended to install

`npm i --save typed-redux-saga` - provide strongly-typed effects for redux-saga

## Get started

```tsx
// bootstrap.tsx
import { applyMiddleware, createStore, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';
import React from 'react';
import ReactDOM from 'react-dom';
import {
    ComponentLifecycleService,
    OperationService,
    asyncOperationsReducer,
    Root,
    useOperation,
} from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';
import App from './your-app-path.js';

const sagaMiddleware = createSagaMiddleware();
const store = applyMiddleware(sagaMiddleware)(createStore)(
    combineReducers({
        asyncOperations: asyncOperationsReducer,
    })
);

// set up destination for storage
useOperation.setPath(state => state.asyncOperations);

// two basic services which provide library workflow
const operationService = new OperationService();
const componentLifecycleService = new ComponentLifecycleService(operationService);

sagaMiddleware.run(function* () {
    yield* call(operationService.run);
    yield* call(componentLifecycleService.run);
});

ReactDOM.render(
    <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
        <Provider store={store}>
            <App />
        </Provider>
    </Root>,
    window.document.getElementById('app')
);
```

## API

### Operations

The core data structure which represents some part of your application state is `AsyncOperation`.

```ts
type AsyncOperation<TRes = unknown, TArgs = unknown[], TMeta = unknown, TErr = Error> = {
    id: OperationId<TRes, TArgs, TMeta, TErr>; // uniq id
    isLoading?: boolean; // is operation in process
    isError?: boolean; // was operation finished with error
    isBlocked?: boolean; // should operation be executed
    error?: TErr; // error if any
    args?: TArgs; // arguments operation was executed with
    result?: TRes; // result of operation if it was finished
    meta?: TMeta; // any additional data
};
```

So the whole state of the application is represented by dictionary of such operations accessible by their id.

ID of operation is described by custom type `OperationId<TRes, TArgs, TMeta, TErr>` that extends `string` with operation description, so it could be retrieved by type system by ID only. It is just a string at runtime.

```ts
const id = 'MY_ID' as OperationId<MyRes>;
const str: string = id; // OK by all info lost
...
operation.id = str; // TYPE ERROR id has to be of OperationId type
```

### Services

#### 1. Basics

Services are primary containers for your business logic, they are represented by classes, which are inherited from base `Service` class.

```ts
class Service<TRunArgs extends any[] = [], TRes = void> {
    constructor(operationService: OperationService): Service;
    *run(...args: TRunArgs): TRes; // inits service and sets status to "ready"
    *destroy(...args: TRunArgs): void; // cleanup service and sets status to "unavailable"
    getStatus(): 'unavailable' | 'ready';
    getUUID(): string; // uniq service id
}
```

So custom service could be defined like this

```ts
import { Service } from '@iiiristram/sagun';

class MyService extends Service {
    // each service has to override "toString" with custom string.
    // it is used for actions and operations generation.
    // it should be defined as class method NOT AS PROPERTY.
    toString() {
        return 'MyService';
    }

    *foo(a: Type1, b: Type2) {
        // your custom logic
    }
}
```

To make service initialized you should invoke `useService` in the root of components subtree, where this service required, for example in a page root component

```tsx
import { useDI, useService, Operation } from '@iiiristram/sagun';

function HomePage() {
    const context = useDI();
    // create instance of service resolving all its dependencies
    const service = context.createService(MyService);
    // register service in order it could be resolved as dependency for other services
    context.registerService(service);
    // init service
    const { operationId } = useService(service);

    return (
        // await service initialization
        <Operation operationId={operationId}>{() => <Content />}</Operation>
    );
}
```

#### 2. Save results to store

In order to save method result to redux store, method has to be marked with `@operation` decorator

```ts
// MyService.ts
import { Service, operation } from '@iiiristram/sagun';

class MyService extends Service {
    toString() {
        return 'MyService';
    }

    @operation
    *foo() {
        return 'Hello';
    }
}
```

```tsx
// MyComponent.tsx
import { useServiceConsumer, useOperation, getId } from '@iiiristram/sagun';

function MyComponent() {
    // resolve service instance, that was registered somewhere in parent components
    const { service } = useServiceConsumer(MyService);
    const operation = useOperation({
        operationId: getId(service.foo), // get operation id from service method
    });
    return <div>{operation?.result} World</div>;
}
```

#### 3. Provide redux action for service method

In order to be able to trigger method from UI by redux action, this method has to be marked with `@daemon` decorator

```ts
import { Service, daemon } from '@iiiristram/sagun';

class MyService extends Service {
    toString() {
        return 'MyService';
    }

    @daemon()
    *foo(a: number, b: number) {
        console.log('Invoked with', a, b);
    }
}
```

```tsx
// MyComponent.tsx
import { useServiceConsumer } from '@iiiristram/sagun';

function MyComponent() {
    const { actions } = useServiceConsumer(MyService);
    return <button onClick={() => actions.foo(1, 2)}>Click me</button>;
}
```

#### 4. Dependency injection

It is possible to declare service dependencies via constructor arguments.
Each dependency should be ether an instance of some class, that extends `Dependency` class, or associated with a string uniq constant (dependency key).
`Service` class has been already inherited from `Dependency`.
Service with custom dependencies should mark them with `@inject` decorator.

```ts
// Service1.ts
import {Service} from '@iiiristram/sagun';

class Service1 extends Service {
    toString() {
        return 'Service1'
    }

    ...
}
```

```ts
// CustomClass.ts
import {Dependency} from '@iiiristram/sagun';

class CustomClass extends Dependency {
    toString() {
        return 'CustomClass'
    }

    ...
}
```

```ts
// customDependency.ts
import {DependencyKey} from '@iiiristram/sagun';

export type Data = {...}
export const KEY = '...' as DependencyKey<Data>
export const DATA: Data = {...}
```

```ts
// somewhere in react components
...
const di = useDI();

// register custom dependency by key
di.registerDependency(KEY, DATA);

// create instance of Dependency resolving all its dependencies
const service1 = context.createService(Service1);
const custom = context.createService(CustomClass);

// register Dependency instancies so they could be resolved as dependencies for other services
context.registerService(service1);
context.registerService(custom);

// create service with resolved dependencies after their registration
const service2 = context.createService(Service2);
...
```

```ts
// Service2.ts
import {Service, inject} from '@iiiristram/sagun';

class Service2 extends Service {
    private _service1: Service1
    private _customClass: CustomClass
    private _data: Data

    toString() {
        return 'Service2'
    }

    constructor(
        // default dependency for all services
        @inject(OperationService) operationService: OperationService,
        @inject(Service1) service1: Service1,
        @inject(CustomClass) customClass: CustomClass,
        @inject(KEY) data: Data
    ) {
        super(operationService)
        this._service1 = service1
        this._customClass = customClass
        this._data = data
    }
    ...
}
```

#### 5. Custom initialization and cleanup

It's possible to customize service initialization and cleanup by overriding `run` and `destroy` methods

```ts
class MyService extends Service<MyArgs, MyRes> {
    toString() {
        return 'MyService'
    }

    *run(...args: MyArgs) {
        // IMPORTANT
        yield call([this, super.run]);
        const result: MyRes = ...;
        return result;
    }

    *destroy(...args: MyArgs) {
        // IMPORTANT
        yield call([this, super.destroy]);
        ...
    }
    ...
}
```

#### 6. Full service description

```ts
class MyService extends Service<MyArgs, MyRes> {
    // OPTIONAL
    private _someOtherService: MyOtherService

    // REQUIRED
    toString() {
        return 'MyService'
    }

    // OPTIONAL
    constructor(
        @inject(OperationService) operationService: OperationService,
        @inject(MyOtherService) someOtherService: MyOtherService
    ) {
        super(operationService)
        this._someOtherService = someOtherService;
    }

    // OPTIONAL
    *run(...args: MyArgs) {
        yield call([this, super.run]);
        yield call(this._someOtherService.run)
        const result: MyRes = ...;
        return result;
    }

    // OPTIONAL
    *destroy(...args: MyArgs) {
        yield call([this, super.run]);
        yield call(this._someOtherService.destroy)
    }

    @daemon() // make method reachable by redux action
    @operation // write result to redux state
    *foo(a: Type1, b: Type2) {
        // your custom logic
    }
}
```

### Decorators

#### 1. operation

This decorator create on operation in redux store for a wrapped service method.

```ts
// MyService.ts
import {Service, operation, OperationId} from '@iiiristram/sagun';

export const MY_CUSTOM_ID = 'MY_CUSTOM_ID' as OperationId<number>

class MyService extends Service {
    toString() {
        return 'MyService'
    }

    // create an operation with auto-generated id,
    // which can be retrieved by util "getId"
    @operation
    *method_1() {
        ...
    }

    // create an operation with provided id,
    // i.e. it's possible to assign same operation for different methods
    @operation(MY_CUSTOM_ID)
    *method_2() {
        return 1;
    }

    // create an operation id depending on arguments provided for method
    @operation((...args) => args.join('_') as OperationId<number>)
    *method_3(...args) {
        return 1;
    }

    @operation({
        // optional, could be constant or function
        id,
        // optional, function that allows to change operation values,
        // but it should not change operation generics
        // (ie if operation result was a number it should be a number after change)
        updateStrategy: function*(operation) {
            const changedOperation  = ... // change operation somehow
            return changedOperation
        },
        ssr: true, // enable execution on server
    })
    *method_4(...args) {
        return 1;
    }
}
```

Update strategy example

```ts
// MyService.ts
import { Service, operation, OperationId } from '@iiiristram/sagun';

class MyService extends Service {
    toString() {
        return 'MyService';
    }

    @operation({
        updateStrategy: function* mergeStrategy(next) {
            const prev = yield select(state => state.asyncOperations.get(next.id));
            return {
                ...next,
                result: prev?.result && next.result ? [...prev.result, ...next.result] : next.result || prev?.result,
            };
        },
    })
    *loadList(pageNumber: number) {
        const items: Array<Entity> = yield call(fetch, { pageNumber });
        return items;
    }
}
```

#### 2. daemon

This decorator provide some meta-data for method, so it could be invoked by redux action after `service.run` called.
Decorator doesn't affect cases when method directly called from another saga, all logic applied only for redux actions.

```ts
import {Service, daemon, DaemonMode} from '@iiiristram/sagun';

class MyService extends Service {
    toString() {
        return 'MyService'
    }

    // by default method won't be called until previous call finished (DaemonMode.Sync).
    // i.e. block new page load until previous page loaded
    @daemon()
    *method_1(a: number, b: number) {
        ...
    }

    // cancel previous call and starts new (like redux-saga takeLatest)
    // i.e. multiple clicks to "Search" button
    @daemon(DaemonMode.Last)
    *method_2(a: number, b: number) {
        ...
    }

    // call method every time, no order guarantied (like redux-saga takeEvery)
    // i.e. send some analytics
    @daemon(DaemonMode.Every)
    *method_3(a: number, b: number) {
        ...
    }

    // has no corresponding action,
    // after service run, method will be called every N ms, provided by second argument
    // i.e. make some polling
    @daemon(DaemonMode.Schedule, ms)
    *method_4() {
        ...
    }

    @daemon(
        // DaemonMode.Sync / DaemonMode.Last / DaemonMode.Every
        mode,
        // provide action to trigger instead of auto-generated action,
        // same type as redux-saga "take" effect accepts
        action
    )
    *method_5(a: number, b: number) {
        ...
    }
}
```

#### 3. inject

This decorator has to be applied to arguments of service's constructor in order service dependencies could be resolved.

```ts
// MyService.ts
import {Service, inject} from '@iiiristram/sagun';

class MyService extends Service {
    ...
    constructor(
        // default dependency for all services
        @inject(OperationService) operationService: OperationService,
        @inject(MyOtherService) myOtherService: MyOtherService
    ) {
        super(operationService)
        ...
    }
    ...
}
```

### Hooks

#### 1. useSaga

Binds saga execution to component lifecycle. Executes in a `useMemo`-like way. 
Hook executes on render, not on reconciliation complete (required for Suspense compatibility). 

Should be used to execute some application logic like form initialization, or to aggregate
multiple methods of services

```tsx
function MyComponent(props) {
    const {a, b} = props;
    // operationId to subscribe to onLoad results
    const {operationId} = useSaga({
        // "id" required in case component placed inside Suspense boundary,
        // cause in some cases React drop component state, 
        // and it's impossible to generate stable implicit id.
        // See https://github.com/facebook/react/issues/24669.
        //
        // Id has to be uniq for each component instance (i.e. use `item_${id}` for list items).
        id: "operation-id",
        // executes after reconciliation process finished
        onLoad: function*(arg_a, arg_b) {
            console.log('I am rendered')
            yield call(service1.foo, arg_a)
            yield call(service2.bazz, arg_b)
        },
        // executes before new reconciliation
        onDispose: function*(arg_a, arg_b) {
            console.log('I was changed')
        }
    // arguments for sagas, so sagas re-executed on any argument change
    }, [a, b])

    ...
}

```

If changes happened in the middle of long running `onLoad`, this saga will be canceled (break on nearest yield) and `onDispose` will be called.
It is guaranteed that `onDispose` will be fully executed before next `onLoad`, so if changes happened multiple times during long running `onDispose`, `onLoad` will be called only once with latest arguments. `onLoad` is wrapped into operation, so you are able to subscribe to its execution using `operationId`, provided by the hook.

#### 2. useService

```tsx
const { operationId } = useService(service, [...args]);
```

This is shortcut for

```tsx
const { operationId } = useSaga(
    {
        onLoad: service.run,
        onDispose: service.dispose,
    },
    [...args]
);
```

#### 3. useServiceConsumer

This hook retrieves service by its constructor, and create corresponding redux actions to invoke methods, marked by `@daemon` decorator. Actions are bond to store, so no `dispatch` necessary.

```ts
import { Service, daemon } from '@iiiristram/sagun';

class MyService extends Service {
    toString() {
        return 'MyService';
    }

    @daemon()
    *foo(a: number, b: number) {
        console.log('Invoked with', a, b);
    }
}
```

```tsx
// MyComponent.tsx
import { useServiceConsumer } from '@iiiristram/sagun';

function MyComponent() {
    const { actions } = useServiceConsumer(MyService);
    return <button onClick={() => actions.foo(1, 2)}>Click me</button>;
}
```

#### 4. useOperation

This hook creates a subscription to operation in the redux store. It is compatible with `React.Suspense`, so it's possible to fallback to some loader while operation is executing.

```ts
// MyService.ts
import { Service, operation } from '@iiiristram/sagun';

class MyService extends Service {
    toString() {
        return 'MyService';
    }

    @operation
    *foo() {
        return 'Hello';
    }
}
```

```tsx
// MyComponent.tsx
import { useServiceConsumer, useOperation, getId } from '@iiiristram/sagun';

function MyComponent() {
    const { service } = useServiceConsumer(MyService);
    const operation = useOperation({
        operationId: getId(service.foo),
        suspense: true, // turn on Suspense compatibility
    });

    return <div>{operation?.result} World</div>;
}
```

```tsx
// Parent.tsx
function Parent() {
    return (
        <Suspense fallback="">
            <MyComponent />
        </Suspense>
    );
}
```

Before using the hook your should provide path in store, where to look for operation.

```ts
// bootstrap.ts
useOperation.setPath(state => ...) // i.e. state => state.asyncOperations
```

#### 4. useDI

This hook return a context which is primally used to register and resolve dependencies for your services. Context API looks like

```ts
type IDIContext = {
    // register custom dependency by key
    registerDependency<D>(key: DependencyKey<D>, dependency: D): void;
    // get custom dependency by key
    getDependency<D>(key: DependencyKey<D>): D;
    // register dependency instance
    registerService: (service: Dependency) => void;
    // create dependency instance resolving all sub-dependencies,
    // in case they were registered before, throw an error otherwise
    createService: <T extends Dependency>(Ctr: Ctr<T>) => T;
    // retrieve dependency instance if it was registered,
    // throw an error otherwise
    getService: <T extends Dependency>(Ctr: Ctr<T>) => T;
    // create actions for service methods marked by @daemon,
    // bind them to store if any provided
    createServiceActions: <T extends BaseService<any, any>>(service: T, bind?: Store<any, AnyAction>) => ActionAPI<T>;
};
```

### Components

#### 1. Root

This component provides all necessary contexts. You have to wrap your application with it.

```tsx
import {
    ComponentLifecycleService,
    OperationService,
    Root,
} from '@iiiristram/sagun';

...

const operationService = new OperationService();
const componentLifecycleService = new ComponentLifecycleService(operationService);

ReactDOM.render(
    <Root
        operationService={operationService}
        componentLifecycleService={componentLifecycleService}
    >
        <App />
    </Root>,
    window.document.getElementById('app')
);
```

#### 2. Operation

This component encapsulates `useOperation`

```tsx
import {useSaga, Operation} from '@iiiristram/sagun';

function MyComponent() {
    const {operationId} = useSaga({
        onLoad: function* () {
            // do something
        }
    );

    return (
        // await service initialization
        <Operation operationId={operationId}>
            {() => <Content/>}
        </Operation>
    )
}
```

### Contexts

#### 1. DIContext

Provides IoC container, you shouldn't use this context directly, there is hook `useDI` for this purpose.

#### 2. DisableSsrContext

Provides boolean flag, if `false` no sagas will be executed on server in a children subtrees.

### HoC

#### 1. withSaga

Encapsulates saga binding with operation subscription.
Uses `useSaga`, `useOperation`, `useDI` and `Suspense` inside.

```tsx
const MyComponent = withSaga({
    // factory provided with DIContext
    sagaFactory: ({ getService }) => ({
        onLoad: function* (id: string) {
            const service = getService(MyService);
            return yield call(service.fetch, id);
        },
    }),
    // converts component props to useSaga "args" list
    argsMapper: ({ id }: Props) => [id],
})(({ operation }) => {
    // rendered after operation finished,
    return <div>{operation.result}</div>;
});

const Parent = () => {
    // fallback to Loader till operation not finished
    return <MyComponent id="1" fallback={<Loader />} />;
};
```

#### 2. withService

Encapsulates saga binding with operation subscription.
Uses `useService`, `useServiceConsumer`, `useDI`, `useOperation` and `Suspense` inside.

```tsx
const MyComponent = withService({
    // factory provided with DIContext
    serviceFactory: ({ createService }) => {
        return createService(MyService);
    },
    // converts component props to useService "args" list
    argsMapper: ({ id }: Props) => [id],
})(({ operation, service, action }) => {
    // rendered after service registered and initialized,
    return <div onClick={() => actions.foo()}>{service.getStatus()}</div>;
});

const Parent = () => {
    // fallback to Loader till operation not finished
    return <MyComponent id="1" fallback={<Loader />} />;
};
```

### SSR

In order to make your sagas work with SSR you should do the following

```tsx
// MyService.ts
class MyService extends Service {
    @operation({
        // Enable ssr for operation, so it's result will be collected.
        // Operations marked this way won't be executed on client at first time,
        // so don't put here any logic with application state, like forms,
        // such logic probably has to be also executed on the client.
        // You should collect pure data here.
        ssr: true
    })
    *fetchSomething() {
        //
    }
}

// MyComponent.tsx
function MyComponent() {
    const {operationId} = useSaga({
        onLoad: myService.fetchSomething,
    })

    return (
        // subscribe to saga that contains the operation via Operation or useOperation,
        // if no subscription, render won't await this saga
        <Operation
            // getId(myService.fetchSomething) also could be used
            operationId={operationId}
        >
            {({result}) => <Content result={result}/>}
        </Operation>
    )
}

// App.tsx
function App() {
    return (
        // ensure there is Suspense that will handle your operation
        <Suspense fallback="">
            <MyComponent/>
        </Suspense>
    )
}

// server.ts
import { renderToStringAsync } from '@iiiristram/serverRender';

useOperation.setPath(state => state);
const render = async (req, res) => {
    const sagaMiddleware = createSagaMiddleware();
    const store = applyMiddleware(sagaMiddleware)(createStore)(
        asyncOperationsReducer
    );

    // provide "hash" option
    const operationService = new OperationService({ hash: {} });
    const componentLifecycleService = new ComponentLifecycleService(operationService);

    const task = sagaMiddleware.run(function* () {
        yield* call(operationService.run);
        yield* call(componentLifecycleService.run);
    });

    // this will incrementally render application,
    // awaiting till all Suspense components resolved
    const html = await renderToStringAsync(
        <Root
            operationService={operationService}
            componentLifecycleService={componentLifecycleService}
        >
            <Provider store={store}>
                <App />
            </Provider>
        </Root>
    );

    // cleanup sagas
    task.cancel();
    await task.toPromise();

    res.write(`
        <html>
            <body>
                <script id="state">
                    window.__STATE_FROM_SERVER__ = ${JSON.stringify(store.getState())};
                </script>
                <script id="hash">
                    window.__SSR_CONTEXT__ = ${JSON.stringify(operationService.getHash())};
                </script>
                <div id="app">${html}</div>
            </body>
        </html>
    `.trim());
    res.end();
});

// client.ts
const sagaMiddleware = createSagaMiddleware();
const store = applyMiddleware(sagaMiddleware)(createStore)(
    asyncOperationsReducer,
    window.__STATE_FROM_SERVER__
);

const operationService = new OperationService({ hash: window.__SSR_CONTEXT__ });
const componentLifecycleService = new ComponentLifecycleService(operationService);

sagaMiddleware.run(function* () {
    yield* call(operationService.run);
    yield* call(componentLifecycleService.run);
});

useOperation.setPath(state => state);

ReactDOM.hydrate(
    <Root operationService={operationService} componentLifecycleService={service}>
        <Provider store={store}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </Provider>
    </Root>,
    window.document.getElementById('app'),
);
```
