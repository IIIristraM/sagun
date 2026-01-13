# Editing Data

import MultiFilePlayground from '@site/src/components/MultiFilePlayground';

Earlier we looked at how to read data, but we also need to react to user actions to modify data.

## The daemon Decorator

Let's create another entity — Order. Besides loading orders, we can also create a new order.

To call service methods outside of sagas, we'll use the [daemon](../api/decorators/daemon) decorator:

```ts
class OrderService extends Service {
    toString() {
        return "OrderService"
    }

    @operation
    *getOrders() {
        return yield* call(fetchOrders);
    }

    // Creates a redux action for this method.
    // This allows us to call it from anywhere, not just from useSaga
    @daemon()
    *addOrder() {
        const id = getNewId();
        yield* call(addOrder, {id, description: `Order ${id}`});
        // update order data in store
        yield* call(this.getOrders);
    }
}
```

Let's add our service to the application:

```tsx
function App({children}) {
    const di = useDI();
    
    const userService = di.createService(UserService);
    di.registerService(userService)

    // highlight-start
    const orderService = di.createService(OrderService);
    di.registerService(orderService)

    const {operationId} = useService([userService, orderService]);
    // highlight-end

    return (...);
}
```

Now let's write an interface that provides order management.

<MultiFilePlayground
  files={[
   {
        name: 'Orders.tsx',
        code: `
function Orders() {
    // get actions object to call service methods
    const {service, actions} = useServiceConsumer(OrderService);
    // initiate first data load on component mount
    useSaga({ id: 'fetch-orders', onLoad: service.getOrders});
    // since we need current order data, not just the first load result from useSaga,
    // we subscribe directly to the service method result.
    // The ID of any method marked with @operation decorator can be obtained via getId helper
    const {result, isLoading} = useOperation({operationId: getId(service.getOrders)});

    return (
        <div>
            <button style={{display: 'block'}} onClick={actions.addOrder}>Add order</button>
            {result && !isLoading ? (
                <div style={{display: 'grid'}}>
                    {result.map(order => <Order key={order.id} {...order} />)}
                </div>
            ) : 'Loading orders'}
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
    toString() {
        return "UserService"
    }

    @operation
    *getUserInfo() {
        return yield* call(fetchUser);
    }
}`.trim()
    },
    {
        name: 'OrderService.ts',
        language: 'typescript',
        code: `
class OrderService extends Service {
    toString() {
        return "OrderService"
    }

    @operation
    *getOrders() {
        return yield* call(fetchOrders);
    }

    // Creates a redux action for this method.
    // This allows us to call it from anywhere, not just from useSaga
    @daemon()
    *addOrder() {
        const id = getNewId();
        yield* call(addOrder, {id, description: \`Order \${id}\`});
        // update order data in store
        yield* call(this.getOrders);
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
    
    const userService = di.createService(UserService);
    di.registerService(userService)
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

:::warning

It's not recommended to call service methods from other sagas via `actions`, as such calls won't be cancelled when the parent saga is cancelled.

```ts
useSaga({ 
    onLoad: function * () {
        // wrong, on component unmount onLoad will be cancelled, but foo won't
        actions.foo();
        // correct
        yield call(service.foo)
    }
})
```

:::

:::tip

The default behavior of the `daemon` decorator is that the method won't be called while the current call is still running (applies only to calls via actions). This helps avoid redundant triggers out of the box — extra button clicks, multiple scroll events during pagination, etc.

This behavior can be changed by specifying decorator arguments, read more in the [documentation](../api/decorators/daemon).
:::

## Operation Strategies

You may notice that each time we add an order, we see a loader — this is not great UX. Plus, we're making unnecessary requests for the order list.
Let's make order addition on the client side.

For this, we can write an operation update strategy that can transform data before writing it to the store. The strategy has a simple contract — it takes operation data as input and should return it in the same format, including the operation result type.

```ts
// Create an explicit ID for operations on the order list.
// This allows us to edit the same data in the store with different methods.
const ORDERS_OPERATION_ID = 'orders'

// describe a strategy that solves two problems:
// - adds new orders to the list
// - by default, each time an async operation runs, its previous result is reset;
//   we explicitly describe that during loading the previous result should be returned,
//   this eliminates the loader in the UI
function* appendStrategy(next) {
    const prev = yield select(state => state.asyncOperations.get(next.id));
    return {
        ...next,
        result: prev?.result && next.result 
            ? [...prev.result, ...next.result] 
            : next.result || prev?.result,
    };
}

class OrderService extends Service {
    // mark all methods that will edit the list with our ID
    // highlight-next-line
    @operation(ORDERS_OPERATION_ID)
    *getOrders() { ... }

    @daemon()
    // highlight-start
    @operation({
        id: ORDERS_OPERATION_ID
        updateStrategy: appendStrategy
    })
    // highlight-end
    *addOrder() {
        const id = getNewId();
        const order = {id, description: `Order ${id}`};

        yield* call(addOrder, order);
        // return the created order to add it to the list
        // highlight-next-line
        return [order];
    }
}
```

:::tip

You can write many reusable strategies for typical cases — adding/removing from a list, various data merging, etc.

This makes service methods lighter and more readable, and declaratively describes how their execution results will be processed.

:::

Let's test our solution:

<MultiFilePlayground
  files={[
   {
        name: 'Orders.tsx',
        code: `
function Orders() {
    const {service, actions} = useServiceConsumer(OrderService);
    useSaga({ id: 'fetch-orders', onLoad: service.getOrders});
    const {result, isLoading} = useOperation({operationId: getId(service.getOrders)});

    return (
        <div>
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
    toString() {
        return "UserService"
    }

    @operation
    *getUserInfo() {
        return yield* call(fetchUser);
    }
}`.trim()
    },
    {
        name: 'OrderService.ts',
        language: 'typescript',
        code: `
const ORDERS_OPERATION_ID = 'orders'

class OrderService extends Service {
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