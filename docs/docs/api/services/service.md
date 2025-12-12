# Service

Main class for user services with OperationService integration.

## Definition

```typescript
class Service<TRunArgs extends any[] = [], TRes = void> 
  extends BaseService<TRunArgs, TRes> {
  
  protected _operationsService: OperationService;
  
  constructor(@inject(OperationService) operationService: OperationService);
}
```

## Type Parameters

| Parameter | Description |
|-----------|-------------|
| `TRunArgs` | Tuple type for `run()` method arguments |
| `TRes` | Return type of `run()` method |

## Description

`Service` is the primary class you should extend when creating your own services. It:

- Extends [BaseService](./base-service) with all its features
- Integrates with [OperationService](./operation-service) for operation management
- Automatically handles operation cleanup on `destroy()`

## Basic Example

```typescript
import { Service, operation, daemon } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

class UserService extends Service {
  // REQUIRED: unique identifier
  toString() {
    return 'UserService';
  }

  @operation
  @daemon()
  *fetchUser(id: string) {
    return yield* call(api.getUser, id);
  }

  @operation
  *updateUser(id: string, data: UserData) {
    return yield* call(api.updateUser, id, data);
  }
}
```

## With Custom Initialization

```typescript
class ProductService extends Service<[string], Product[]> {
  private categoryId: string = '';

  toString() {
    return 'ProductService';
  }

  *run(categoryId: string) {
    // Call super.run() first
    yield* call([this, super.run]);
    
    this.categoryId = categoryId;
    
    // Load initial data
    return yield* call(this.fetchProducts);
  }

  *destroy() {
    // Call super.destroy()
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

## See Also

- [BaseService](./base-service) - Base class
- [OperationService](./operation-service) - Operation management
- [@operation](../decorators/operation) - Operation decorator
- [@daemon](../decorators/daemon) - Daemon decorator
- [useService](../hooks/use-service) - Service initialization hook

