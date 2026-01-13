# Service

Main class for creating user services.

## Definition

```typescript
class Service<TRunArgs extends any[] = [], TRes = void> extends Dependency {
  protected _operationsService: OperationService;
  
  constructor(@inject(OperationService) operationService: OperationService);
  
  *run(...args: TRunArgs): Generator<any, TRes | undefined>;
  *destroy(...args: TRunArgs): Generator<any, void>;
  getStatus(): 'unavailable' | 'ready';
  getUUID(): string;
}
```

## Type Parameters

| Parameter | Description |
|-----------|-------------|
| `TRunArgs` | Tuple type for `run()` method arguments |
| `TRes` | Return type of `run()` method |

## Methods

| Method | Description |
|--------|-------------|
| `run(...args)` | Initialize service, start daemons, set status to `ready` |
| `destroy(...args)` | Cleanup service, stop daemons, set status to `unavailable` |
| `getStatus()` | Get current service status: `'unavailable'` or `'ready'` |
| `getUUID()` | Get unique instance identifier |

## Description

`Service` is the primary class you should extend when creating your own services. It extends [Dependency](./dependency) and provides:

- **OperationService integration** — for the `@operation` decorator to work
- **Lifecycle management** via `run()` and `destroy()` methods
- **Daemon support** for methods decorated with `@daemon`
- **Status tracking** to know if service is ready
- **Unique instance ID** for identification
- **Automatic operation cleanup** on `destroy()`

## Lifecycle

1. Service is created with status `'unavailable'`
2. `run()` is called → starts all daemons → status becomes `'ready'`
3. `destroy()` is called → stops all daemons → status becomes `'unavailable'`

## Basic Example

```typescript
import { Service, operation, daemon } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

class UserService extends Service {
  // REQUIRED: unique identifier for DI and Redux actions
  toString() {
    return 'UserService';
  }

  @operation
  *fetchUser(id: string) {
    return yield* call(api.getUser, id);
  }

  @operation
  *updateUser(id: string, data: UserData) {
    return yield* call(api.updateUser, id, data);
  }
}
```

## With Daemons

```typescript
import { Service, daemon, DaemonMode } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

class PollingService extends Service {
  toString() {
    return 'PollingService';
  }

  // Method will be called every 5 seconds after service starts
  @daemon(DaemonMode.Schedule, 5000)
  *poll() {
    console.log('Polling...');
    yield* call(api.checkUpdates);
  }
}

// Usage
const service = new PollingService();
console.log(service.getStatus()); // 'unavailable'

yield* call(service.run);
console.log(service.getStatus()); // 'ready'
// poll() is now running every 5 seconds

yield* call(service.destroy);
console.log(service.getStatus()); // 'unavailable'
// poll() is stopped
```

## With Custom Initialization

```typescript
class ProductService extends Service<[string], Product[]> {
  private categoryId: string = '';

  toString() {
    return 'ProductService';
  }

  *run(categoryId: string) {
    // IMPORTANT: Call super.run() first
    yield* call([this, super.run]);
    
    this.categoryId = categoryId;
    
    // Load initial data
    return yield* call(this.fetchProducts);
  }

  *destroy() {
    // IMPORTANT: Call super.destroy()
    yield* call([this, super.destroy]);
    
    this.categoryId = '';
  }

  @operation
  *fetchProducts() {
    return yield* call(api.getProducts, this.categoryId);
  }
}
```

## With Dependencies

```typescript
class OrderService extends Service {
  private userService: UserService;
  private cartService: CartService;

  toString() {
    return 'OrderService';
  }

  constructor(
    @inject(OperationService) os: OperationService,
    @inject(UserService) userService: UserService,
    @inject(CartService) cartService: CartService,
  ) {
    super(os);
    this.userService = userService;
    this.cartService = cartService;
  }

  @operation
  @daemon()
  *createOrder() {
    const user = yield* call(this.userService.getCurrentUser);
    const cart = yield* call(this.cartService.getCart);
    
    return yield* call(api.createOrder, { user, cart });
  }
}
```

## Usage in Components

### Registration and Initialization

```tsx
import { useDI, useService, Operation } from '@iiiristram/sagun';

function ProductPage({ categoryId }) {
  const di = useDI();
  
  // Create and register service
  const service = di.createService(ProductService);
  di.registerService(service);
  
  // Initialize with arguments
  const { operationId } = useService(service, [categoryId]);
  
  return (
    <Suspense fallback={<Spinner />}>
      <Operation operationId={operationId}>
        {() => <ProductList />}
      </Operation>
    </Suspense>
  );
}
```

### Accessing Service in Child Components

After registering a service, you can access it in any child component via `useServiceConsumer`:

```tsx
import { useServiceConsumer, useSaga, useOperation, getId } from '@iiiristram/sagun';

function ProductList() {
  // Get service instance and actions for calling daemon methods
  const { service, actions } = useServiceConsumer(ProductService);
  
  // Load data on mount
  useSaga({ 
    id: 'load-products', 
    onLoad: service.fetchProducts 
  });
  
  // Subscribe to operation result
  const { result: products, isLoading } = useOperation({
    operationId: getId(service.fetchProducts)
  });
  
  if (isLoading) return <Spinner />;
  
  return (
    <div>
      {products?.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
      <button onClick={actions.refreshProducts}>
        Refresh
      </button>
    </div>
  );
}
```

`useServiceConsumer` returns:
- `service` — service instance for calling methods in sagas
- `actions` — object with Redux actions for methods decorated with `@daemon`

## See Also

- [Dependency](./dependency) — Base class for dependencies
- [OperationService](./operation-service) — Operation management
- [@operation](../decorators/operation) — Operation decorator
- [@daemon](../decorators/daemon) — Daemon decorator
- [useService](../hooks/use-service) — Service initialization hook
- [useServiceConsumer](../hooks/use-service-consumer) — Service access hook
