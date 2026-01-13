# Custom Decorators

import MultiFilePlayground from '@site/src/components/MultiFilePlayground';

In previous chapters, we used built-in decorators `@operation` and `@daemon` to extend service method functionality. But what if we need custom logic that will be applied to many methods? In this case, we can create our own decorators.

## TypeScript Configuration

:::warning Important
Sagun uses the **legacy version of TypeScript decorators** (Stage 2), not the new ECMAScript decorator standard. This is because the new standard doesn't support parameter decoration, which is necessary for DI implementation.
:::

For decorators to work, make sure the `experimentalDecorators` option is enabled in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

## Decorator Advantages

Decorators provide a powerful mechanism for extending functionality without changing the original method code:

- **Reusability** — a decorator written once can be applied to any number of methods
- **Declarativeness** — extension logic is explicitly indicated above the method, improving code readability  
- **Separation of concerns** — the main method logic remains clean, and additional functionality is moved to the decorator
- **Composition** — decorators can be combined, layering functionality

## Creating Your Own Decorator

Let's look at a practical example — we'll create a `@log` decorator that will log method calls to the console.

```ts
function log(target: any, key: string, descriptor: PropertyDescriptor) {
    const origin = descriptor.value;

    // Wrap the original method
    function* logged(...args: any[]) {
        console.log(`▶ [${target.toString()}] ${key} called with args:`, args);
        
        try {
            // Call the original method preserving context
            const result = yield* call([this, origin], ...args);
            console.log(`✓ [${target.toString()}] ${key} returned:`, result);
            return result;
        } catch (error) {
            console.error(`✗ [${target.toString()}] ${key} error:`, error);
            throw error;
        }
    }

    // Preserve original method properties (e.g., operation id)
    descriptor.value = Object.assign(logged, origin);
    return descriptor;
}
```

Now let's apply our decorator to a service from previous examples:

```ts
class OrderService extends Service {
    toString() {
        return "OrderService"
    }

    @log
    @operation
    *getOrders() {
        return yield* call(fetchOrders);
    }

    @log
    @daemon()
    *addOrder() {
        const id = getNewId();
        yield* call(addOrder, {id, description: `Order ${id}`});
        yield* call(this.getOrders);
    }
}
```

Full example:

Open the browser console (F12 → Console) to see method call logs.

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
            <p style={{color: '#888', fontSize: 12}}>
                Open the browser console (F12) to see logs
            </p>
            <button style={{display: 'block', marginBottom: 8}} onClick={actions.addOrder}>
                Add order
            </button>
            {result && !isLoading ? (
                <div style={{display: 'grid', gap: 4}}>
                    {result.map(order => <Order key={order.id} {...order} />)}
                </div>
            ) : 'Loading orders...'}
        </div>
    );
}
`.trim()
    },
    {
        name: 'decorators.ts',
        language: 'typescript',
        code: `
// Decorator for logging method calls
function log(target: any, key: string, descriptor: PropertyDescriptor) {
    const origin = descriptor.value;

    function* logged(...args: any[]) {
        console.log(\`▶ [\${target.toString()}] \${key} called with args:\`, args);
        
        try {
            const result = yield* call([this, origin], ...args);
            console.log(\`✓ [\${target.toString()}] \${key} returned:\`, result);
            return result;
        } catch (error) {
            console.error(\`✗ [\${target.toString()}] \${key} error:\`, error);
            throw error;
        }
    }

    descriptor.value = Object.assign(logged, origin);
    return descriptor;
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

    // Apply @log to log calls
    @log
    @operation
    *getOrders() {
        return yield* call(fetchOrders);
    }

    @log
    @daemon()
    *addOrder() {
        const id = getNewId();
        yield* call(addOrder, {id, description: \`Order \${id}\`});
        yield* call(this.getOrders);
    }
}`.trim()
    },
    {
      name: 'App.tsx',
      language: 'tsx',
      code: `
function App({children}) {
    const di = useDI();
    
    di.unregisterService(OrderService)
    const orderService = di.createService(OrderService);
    di.registerService(orderService)

    const {operationId} = useService(orderService);

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

## Decorator Order

Decorators in TypeScript are applied **bottom to top** — the bottommost decorator is applied first, then the next one wraps it, and so on. This is important to understand when composing multiple decorators.

Let's look at this with two decorators: `@log` and `@errorHandler`. The `@errorHandler` decorator catches errors and returns a fallback value instead of throwing an exception:

```ts
function errorHandler(fallback: any) {
    return function(target: any, key: string, descriptor: PropertyDescriptor) {
        const origin = descriptor.value;

        function* caught(...args: any[]) {
            try {
                return yield* call([this, origin], ...args);
            } catch (error) {
                console.warn(`[${key}] error caught, returning fallback`);
                return fallback;
            }
        }

        descriptor.value = Object.assign(caught, origin);
        return descriptor;
    };
}
```

#### Variant 1: @log above @errorHandler

```ts
@log
@errorHandler([])
@operation
*getOrders() { ... }
```

Application order (bottom to top): `operation` → `errorHandler` → `log`

In this case, `@log` wraps `@errorHandler`, so:
- If the method throws an error, `@errorHandler` will catch it
- `@log` will see a successful result (fallback value)
- **Error will NOT be logged**

#### Variant 2: @errorHandler above @log

```ts
@errorHandler([])
@log
@operation
*getOrders() { ... }
```

Application order (bottom to top): `operation` → `log` → `errorHandler`

In this case, `@errorHandler` wraps `@log`, so:
- If the method throws an error, `@log` will see it and log it
- Then the error will "bubble up" to `@errorHandler`, which will catch it
- **Error WILL be logged**

#### Interactive Example

Try changing the order of `@log` and `@errorHandler` decorators in the `OrderService.ts` file and click the "Break loading" button. Notice the console — in one case the error is logged, in the other it's not.

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
            <p style={{color: '#888', fontSize: 12}}>
                Open the browser console (F12) and try swapping @log and @errorHandler
            </p>
            <button 
                style={{display: 'block', marginBottom: 8}} 
                onClick={actions.breakAndReload}
            >
                Break loading
            </button>
            {result && !isLoading ? (
                <div style={{display: 'grid', gap: 4}}>
                    {result.map(order => <Order key={order.id} {...order} />)}
                </div>
            ) : 'Loading orders...'}
        </div>
    );
}
`.trim()
    },
    {
        name: 'decorators.ts',
        language: 'typescript',
        code: `
// Logs method call and its result/error
function log(target: any, key: string, descriptor: PropertyDescriptor) {
    const origin = descriptor.value;

    function* logged(...args: any[]) {
        console.log(\`▶ [\${target.toString()}] \${key} called\`);
        
        try {
            const result = yield* call([this, origin], ...args);
            console.log(\`✓ [\${target.toString()}] \${key} success\`);
            return result;
        } catch (error) {
            console.error(\`✗ [\${target.toString()}] \${key} ERROR:\`, error.message);
            throw error;
        }
    }

    descriptor.value = Object.assign(logged, origin);
    return descriptor;
}

// Catches errors and returns fallback value
function errorHandler(fallback: any) {
    return function(target: any, key: string, descriptor: PropertyDescriptor) {
        const origin = descriptor.value;

        function* caught(...args: any[]) {
            try {
                return yield* call([this, origin], ...args);
            } catch (error) {
                console.warn(\`🛡 [\${key}] error caught, returning fallback\`);
                return fallback;
            }
        }

        descriptor.value = Object.assign(caught, origin);
        return descriptor;
    };
}`.trim()
    },
    {
        name: 'OrderService.ts',
        language: 'typescript',
        code: `
let shouldFail = false;

class OrderService extends Service {
    toString() {
        return "OrderService"
    }

    // Try swapping @log and @errorHandler
    // Currently: @log above @errorHandler — error is NOT logged
    @log
    @errorHandler([])
    @operation
    *getOrders() {
        if (shouldFail) {
            shouldFail = false;
            throw new Error('Oops! Server unavailable');
        }
        return yield* call(fetchOrders);
    }

    @daemon()
    *breakAndReload() {
        shouldFail = true;
        yield* call(this.getOrders);
    }
}`.trim()
    },
    {
      name: 'App.tsx',
      language: 'tsx',
      code: `
function App({children}) {
    const di = useDI();
    
    di.unregisterService(OrderService)
    const orderService = di.createService(OrderService);
    di.registerService(orderService)

    const {operationId} = useService(orderService);

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

:::tip

With decorator ordering, you can very flexibly configure method behavior just by swapping lines — what to log, which errors bubble up, validations, etc.

:::
