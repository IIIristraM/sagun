import MultiFilePlayground from '@site/src/components/MultiFilePlayground';

# Dependency Injection

Entities in the domain typically have relationships, and to describe any user scenario, you need to operate with multiple entities. To solve this task, the framework has a built-in DI container that allows you to declaratively describe and resolve dependencies between services.

## Dependencies on Services

In our application, we already have user and order entities. Let's imagine that when making a purchase, the user earns bonuses, and we want to update information about their current bonus count after the purchase.

Let's add the corresponding method to the user service:

```ts
class UserService extends Service {
    @operation
    *getBonuses() {
        return yield* call(fetchBonuses);
    }
}
```

Now we need to update bonus information after placing an order, but this logic is in different services. Let's indicate that OrderService depends on UserService. For this, we'll use the [inject](../api/decorators/inject) decorator.

```ts
class OrderService extends Service {
    // highlight-start
    #userService: UserService

    constructor(
        @inject(OperationService) operationService: OperationService,
        @inject(UserService) userService: UserService
    ) {
        // mandatory base class initialization
        super(operationService)
        this.#userService = userService;
    }
    // highlight-end

    @daemon()
    @operation({
        id: ORDERS_OPERATION_ID,
        updateStrategy: appendStrategy
    })
    *addOrder() {
        const id = getNewId();
        const order = {id, description: `Order ${id}`};

        yield* call(addOrder, order);
        // update bonus information
        // highlight-next-line
        yield* call(this.#userService.getBonuses);
        return [order];
    }
}
```

Now let's update the interface:

<MultiFilePlayground
  files={[
    {
        name: 'Orders.tsx',
        code: `
function Orders() {
    const {service: orderService, actions} = useServiceConsumer(OrderService);
    const {service: userService} = useServiceConsumer(UserService);

    useSaga({ id: 'fetch-orders', onLoad: function * () {
        yield* all([
            call(orderService.getOrders),
            call(userService.getBonuses)
        ])
    }});

    const {result, isLoading} = useOperation({operationId: getId(orderService.getOrders)});
    const {result: bonuses} = useOperation({operationId: getId(userService.getBonuses)});

    return (
        <div>
            <div>Bonuses: {bonuses?.count ?? 'Processing...'}</div>
            <button style={{display: 'block'}} onClick={actions.addOrder}>Add order</button>
            {result ? (
                <div style={{display: 'grid'}}>
                    {result.map(order => <Order key={order.id} {...order} />)}
                </div>
            ) : 'Loading orders...'}
        </div>
    );
}
`.trim()
    },
    {
        name: 'UserService.ts',
        language: 'typescript',
        code: `
class UserService extends Service {
    toString() {
        return "UserService"
    }

    @operation
    *getUserInfo() {
        return yield* call(fetchUser);
    }

    @operation
    *getBonuses() {
        return yield* call(fetchBonuses);
    }
}`.trim()
    },
    {
        name: 'OrderService.ts',
        language: 'typescript',
        code: `
const ORDERS_OPERATION_ID = 'orders' as OperationId<Order[]>

class OrderService extends Service {
    #userService: UserService;

    constructor(
        @inject(OperationService) operationService: OperationService,
        @inject(UserService) userService: UserService
    ) {
        super(operationService)
        this.#userService = userService;
    }

    toString() {
        return "OrderService"
    }

    @operation(ORDERS_OPERATION_ID)
    *getOrders() {
        return yield* call(fetchOrders);
    }

    @daemon()
    @operation({
        id: ORDERS_OPERATION_ID,
        updateStrategy: function* appendStrategy(next) {
            const prev = yield select(state => state.asyncOperations.get(next.id));
            return {
                ...next,
                result: prev?.result && next.result ? [...prev.result, ...next.result] : next.result || prev?.result,
            };
        }
    })
    *addOrder() {
        const id = getNewId();
        const order = {id, description: \`Order \${id}\`};

        yield* call(addOrderV2, order);
        yield* call(this.#userService.getBonuses);
        return [order];
    }
}
`.trim()
    },
    {
      name: 'App.tsx',
      language: 'tsx',
      code: `
function App({children}) {
    const di = useDI();
    di.unregisterService(UserService)
    const userService = di.createService(UserService);
    di.registerService(userService)

    di.unregisterService(OrderService)
    const orderService = di.createService(OrderService);
    di.registerService(orderService)

    const {operationId} = useService([userService, orderService]);

    return (
        <Suspense fallback="Loading data...">
            <Operation operationId={operationId}>
                {() => <>{children}</>}
            </Operation>
        </Suspense>
    );
}`.trim()
    },
    {
        name: "index.tsx",
        hidden: true,
        code: `
render(
    <App>
        <Orders />
    </App>
)
`.trim()
    }
  ]}
/>

:::info

Dependencies must be registered in the order they need to be resolved. 
In our example, the dependency is `UserService => OrderService`, so we register them in that order.

:::

## Dependencies on Custom Classes

Besides services, you can inject any class by inheriting it from the base [Dependency](../api/services/dependency) class.

Let's look at an example of when this might be useful. In our application, we need to make requests to the backend — currently this is described as a set of utilities `fetchUser`, `fetchOrders`, etc. This approach doesn't provide any explicit contract, makes backend work harder to test and configure — let's fix this.

Let's create an explicit contract for the API as a class.

```ts
class API extends Dependency {
    toString() {
        return 'API'
    }

    fetchUser() {};
    fetchBonuses();
    fetchOrders() {};
    addOrder(order) {};
}
```

Register our class:

```tsx
function App({children}) {
    const di = useDI();

    // highlight-next-line
    di.registerService(new API())   

    const userService = di.createService(UserService);
    di.registerService(userService)

    const orderService = di.createService(OrderService);
    di.registerService(orderService)

    return (...)
}
```

Then we can create an explicit dependency of the service on the API:

```ts
class UserService extends Service {
    #api: API;

    toString() {
        return "UserService"
    }

    constructor(
        @inject(OperationService) operationService: OperationService,
        @inject(API) api: API
    ) {
        super(operationService);
        this.#api = api;
    }

    @operation
    *getUserInfo() {
        return yield* call(this.#api.fetchUser);
    }

    @operation
    *getBonuses() {
        return yield* call(this.#api.fetchBonuses);
    }
}
```

Now our API has an explicit contract, and our services are much easier to test since we can substitute any implementation of the API contract.

Full example:

<MultiFilePlayground
  files={[
    {
        name: 'Orders.tsx',
        code: `
function Orders() {
    const {service: orderService, actions} = useServiceConsumer(OrderService);
    const {service: userService} = useServiceConsumer(UserService);

    useSaga({ id: 'fetch-orders', onLoad: function * () {
        yield* all([
            call(orderService.getOrders),
            call(userService.getBonuses)
        ])
    }});

    const {result, isLoading} = useOperation({operationId: getId(orderService.getOrders)});
    const {result: bonuses} = useOperation({operationId: getId(userService.getBonuses)});

    return (
        <div>
            <div>Bonuses: {bonuses?.count ?? 'Processing...'}</div>
            <button style={{display: 'block'}} onClick={actions.addOrder}>Add order</button>
            {result ? (
                <div style={{display: 'grid'}}>
                    {result.map(order => <Order key={order.id} {...order} />)}
                </div>
            ) : 'Loading orders...'}
        </div>
    );
}
`.trim()
    },
    {
        name: 'UserService.ts',
        language: 'typescript',
        code: `
class UserService extends Service {
    #api: API;

    toString() {
        return "UserService"
    }

    constructor(
        @inject(OperationService) operationService: OperationService,
        @inject(API) api: API
    ) {
        super(operationService);
        this.#api = api;
    }

    @operation
    *getUserInfo() {
        return yield* call(this.#api.fetchUser);
    }

    @operation
    *getBonuses() {
        return yield* call(this.#api.fetchBonuses);
    }
}`.trim()
    },
    {
        name: 'OrderService.ts',
        language: 'typescript',
        code: `
const ORDERS_OPERATION_ID = 'orders' as OperationId<Order[]>

class OrderService extends Service {
    #userService: UserService;
    #api: API;

    constructor(
        @inject(OperationService) operationService: OperationService,
        @inject(UserService) userService: UserService,
        @inject(API) api: API
    ) {
        super(operationService)
        this.#userService = userService;
        this.#api = api;
    }

    toString() {
        return "OrderService"
    }

    @operation(ORDERS_OPERATION_ID)
    *getOrders() {
        return yield* call(this.#api.fetchOrders);
    }

    @daemon()
    @operation({
        id: ORDERS_OPERATION_ID,
        updateStrategy: function* appendStrategy(next) {
            const prev = yield select(state => state.asyncOperations.get(next.id));
            return {
                ...next,
                result: prev?.result && next.result ? [...prev.result, ...next.result] : next.result || prev?.result,
            };
        }
    })
    *addOrder() {
        const id = getNewId();
        const order = {id, description: \`Order \${id}\`};

        yield* call(this.#api.addOrderV2, order);
        yield* call(this.#userService.getBonuses);
        return [order];
    }
}
`.trim()
    },
    {
      name: 'App.tsx',
      language: 'tsx',
      code: `
function App({children}) {
    const di = useDI();

    di.registerService(new API())   

    di.unregisterService(UserService)
    const userService = di.createService(UserService);
    di.registerService(userService)

    di.unregisterService(OrderService)
    const orderService = di.createService(OrderService);
    di.registerService(orderService)

    const {operationId} = useService([userService, orderService]);

    return (
        <Suspense fallback="Loading data...">
            <Operation operationId={operationId}>
                {() => <>{children}</>}
            </Operation>
        </Suspense>
    );
}`.trim()
    },
    {
        name: "index.tsx",
        hidden: true,
        code: `
render(
    <App>
        <Orders />
    </App>
)
`.trim()
    }
  ]}
/>

## Dependencies by Key

As a dependency, you can pass not only class instances — you can pass any value by registering it with a key.

For example, applications typically have some context that depends on the environment, such as which backend domain to use in testing vs. production.

In the simplest case, this might look like:

```ts
// use the special DependencyKey type that contains meta-information about the dependency
const APP_CONTEXT_KEY = 'APP_CONTEXT' as DependencyKey<AppContext>;

type AppContext = {
    env: string;
}

const appContext: AppContext = {
    env: "testing"
}
```

```ts
class API extends Dependency {
    #host: string;

    constructor(@inject(APP_CONTEXT_KEY) {env}: AppContext) {
        this.#host = env === "testing" ? "..." : "..."
    }
}
```

We can make it available to our application by registering it as a dependency by key.

```tsx
function App({children}) {
    const di = useDI();

    // highlight-start
    di.registerDependency(APP_CONTEXT_KEY, appContext);
    
    const api = di.createService(API);
    di.registerService(api);
    // highlight-end

    di.unregisterService(UserService)
    const userService = di.createService(UserService);
    di.registerService(userService)

    di.unregisterService(OrderService)
    const orderService = di.createService(OrderService);
    di.registerService(orderService)

    return (...);
}
```

In the UI, you can also read values of any dependencies:

```tsx
const di = useDI();
const appContext = di.getDependency(APP_CONTEXT_KEY);
```

Let's add environment display to the interface:

<MultiFilePlayground
  files={[
    {
        name: 'Orders.tsx',
        code: `
function Orders() {
    const {service: orderService, actions} = useServiceConsumer(OrderService);
    const {service: userService} = useServiceConsumer(UserService);
    const di = useDI();
    const {env} = di.getDependency(APP_CONTEXT_KEY);

    useSaga({ id: 'fetch-orders', onLoad: function * () {
        yield* all([
            call(orderService.getOrders),
            call(userService.getBonuses)
        ])
    }});

    const {result, isLoading} = useOperation({operationId: getId(orderService.getOrders)});
    const {result: bonuses} = useOperation({operationId: getId(userService.getBonuses)});

    return (
        <div>
            <div>Env: {env}</div>
            <div>Bonuses: {bonuses?.count ?? 'Processing...'}</div>
            <button style={{display: 'block'}} onClick={actions.addOrder}>Add order</button>
            {result ? (
                <div style={{display: 'grid'}}>
                    {result.map(order => <Order key={order.id} {...order} />)}
                </div>
            ) : 'Loading orders...'}
        </div>
    );
}
`.trim()
    },
    {
        name: 'UserService.ts',
        language: 'typescript',
        hidden: true,
        code: `
class UserService extends Service {
    #api: API;

    toString() {
        return "UserService"
    }

    constructor(
        @inject(OperationService) operationService: OperationService,
        @inject(API) api: API
    ) {
        super(operationService);
        this.#api = api;
    }

    @operation
    *getUserInfo() {
        return yield* call(this.#api.fetchUser);
    }

    @operation
    *getBonuses() {
        return yield* call(this.#api.fetchBonuses);
    }
}`.trim()
    },
    {
        name: 'OrderService.ts',
        language: 'typescript',
        hidden: true,
        code: `
const ORDERS_OPERATION_ID = 'orders' as OperationId<Order[]>

class OrderService extends Service {
    #userService: UserService;
    #api: API;

    constructor(
        @inject(OperationService) operationService: OperationService,
        @inject(UserService) userService: UserService,
        @inject(API) api: API
    ) {
        super(operationService)
        this.#userService = userService;
        this.#api = api;
    }

    toString() {
        return "OrderService"
    }

    @operation(ORDERS_OPERATION_ID)
    *getOrders() {
        return yield* call(this.#api.fetchOrders);
    }

    @daemon()
    @operation({
        id: ORDERS_OPERATION_ID,
        updateStrategy: function* appendStrategy(next) {
            const prev = yield select(state => state.asyncOperations.get(next.id));
            return {
                ...next,
                result: prev?.result && next.result ? [...prev.result, ...next.result] : next.result || prev?.result,
            };
        }
    })
    *addOrder() {
        const id = getNewId();
        const order = {id, description: \`Order \${id}\`};

        yield* call(this.#api.addOrderV2, order);
        yield* call(this.#userService.getBonuses);
        return [order];
    }
}
`.trim()
    },
    {
      name: 'App.tsx',
      language: 'tsx',
      code: `
function App({children}) {
    const di = useDI();

    di.registerDependency(APP_CONTEXT_KEY, appContext);
    
    const api = di.createService(API);
    di.registerService(api);

    di.unregisterService(UserService)
    const userService = di.createService(UserService);
    di.registerService(userService)

    di.unregisterService(OrderService)
    const orderService = di.createService(OrderService);
    di.registerService(orderService)

    const {operationId} = useService([userService, orderService]);

    return (
        <Suspense fallback="Loading data...">
            <Operation operationId={operationId}>
                {() => <>{children}</>}
            </Operation>
        </Suspense>
    );
}`.trim()
    },
    {
        name: "index.tsx",
        hidden: true,
        code: `
render(
    <App>
        <Orders />
    </App>
)
`.trim()
    }
  ]}
/>
