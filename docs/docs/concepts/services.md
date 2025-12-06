# Services

Services are the primary containers for business logic in Sagun. They encapsulate related functionality and manage their own lifecycle.

## Service Hierarchy

```
Dependency (base class)
    └── BaseService (daemons, lifecycle)
            └── Service (operation service integration)
```

## Creating a Service

```typescript
import { Service, operation, daemon } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

class ProductService extends Service {
  // REQUIRED: Unique identifier
  toString() {
    return 'ProductService';
  }

  @operation
  @daemon()
  *fetchProducts(category: string) {
    const products = yield* call(api.getProducts, category);
    return products;
  }
}
```

## Service Lifecycle

### Initialization

Services are initialized using the `useService` hook:

```tsx
function ProductPage() {
  const di = useDI();
  const service = di.createService(ProductService);
  di.registerService(service);
  
  // Calls service.run() and service.destroy() on unmount
  const { operationId } = useService(service);
  
  return (
    <Operation operationId={operationId}>
      {() => <ProductList />}
    </Operation>
  );
}
```

### Custom Run and Destroy

Override `run` and `destroy` for custom lifecycle logic:

```typescript
class ProductService extends Service<[string], Product[]> {
  private category: string = '';
  
  toString() { return 'ProductService'; }

  *run(category: string) {
    // IMPORTANT: Call super.run() first
    yield* call([this, super.run]);
    
    this.category = category;
    
    // Custom initialization
    yield* call(this.fetchProducts, category);
    
    return this.getProducts();
  }

  *destroy() {
    // IMPORTANT: Call super.destroy()
    yield* call([this, super.destroy]);
    
    // Custom cleanup
    this.category = '';
  }

  @operation
  *fetchProducts(category: string) {
    return yield* call(api.getProducts, category);
  }
}
```

### Service Status

```typescript
service.getStatus(); // 'unavailable' | 'ready'
service.getUUID();   // Unique instance ID
```

## Daemon Modes

The `@daemon` decorator makes methods callable via Redux actions:

```typescript
import { daemon, DaemonMode } from '@iiiristram/sagun';

class SearchService extends Service {
  toString() { return 'SearchService'; }

  // DaemonMode.Sync (default) - Block until previous completes
  @daemon()
  *loadPage(page: number) { /* ... */ }

  // DaemonMode.Last - Cancel previous, run latest (takeLatest)
  @daemon(DaemonMode.Last)
  *search(query: string) { /* ... */ }

  // DaemonMode.Every - Run all in parallel (takeEvery)
  @daemon(DaemonMode.Every)
  *trackEvent(event: string) { /* ... */ }

  // DaemonMode.Schedule - Run periodically
  @daemon(DaemonMode.Schedule, 30000) // Every 30 seconds
  *pollUpdates() { /* ... */ }
}
```

## Calling Service Methods

### From Components (via actions)

```tsx
function SearchForm() {
  const { actions } = useServiceConsumer(SearchService);
  
  return (
    <input onChange={(e) => actions.search(e.target.value)} />
  );
}
```

### From Other Sagas

```typescript
class OrderService extends Service {
  @operation
  *createOrder(items: Item[]) {
    const order = yield* call(api.createOrder, items);
    
    // Direct call to another service method
    yield* call(this._analytics.trackEvent, 'order_created');
    
    return order;
  }
}
```

## Service Best Practices

### 1. Single Responsibility

Each service should handle one domain:

```typescript
// ✅ Good
class UserService extends Service { /* user operations */ }
class AuthService extends Service { /* auth operations */ }

// ❌ Bad
class UserAndAuthService extends Service { /* mixed */ }
```

### 2. Use Dependency Injection

```typescript
class OrderService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(UserService) private userService: UserService,
    @inject(CartService) private cartService: CartService,
  ) {
    super(os);
  }
}
```

### 3. Keep Methods Focused

```typescript
class ProductService extends Service {
  // ✅ Focused methods
  @operation
  *fetchProduct(id: string) { /* ... */ }
  
  @operation  
  *fetchProductReviews(id: string) { /* ... */ }
  
  // ❌ Avoid god methods
  *fetchProductWithReviewsAndRelatedAndCart() { /* ... */ }
}
```

