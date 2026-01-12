# Dependency Injection

Sagun provides a built-in dependency injection container for managing service dependencies.

## Basic Concepts

### Dependencies

Any class extending `Dependency` can be injected:

```typescript
import { Dependency } from '@iiiristram/sagun';

class Logger extends Dependency {
  toString() { return 'Logger'; }
  
  log(message: string) {
    console.log(`[LOG]: ${message}`);
  }
}
```

### Services as Dependencies

`Service` extends `Dependency`, so services can be injected into other services:

```typescript
class UserService extends Service {
  toString() { return 'UserService'; }
  
  @operation
  *fetchUser(id: string) {
    return yield* call(api.getUser, id);
  }
}

class OrderService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(UserService) private userService: UserService,
  ) {
    super(os);
  }
  
  @operation
  *createOrder(userId: string, items: Item[]) {
    // Use injected service
    const user = yield* call(this.userService.fetchUser, userId);
    return yield* call(api.createOrder, { user, items });
  }
}
```

## DependencyKey

For non-class dependencies, use `DependencyKey`:

```typescript
import { DependencyKey } from '@iiiristram/sagun';

// Define key with type
export const API_CONFIG = 'API_CONFIG' as DependencyKey<{
  baseUrl: string;
  timeout: number;
}>;

export const FEATURE_FLAGS = 'FEATURE_FLAGS' as DependencyKey<{
  newCheckout: boolean;
  darkMode: boolean;
}>;
```

## Registration

### Register by Key

```tsx
function App() {
  const di = useDI();
  
  // Register configuration
  di.registerDependency(API_CONFIG, {
    baseUrl: '/api/v2',
    timeout: 5000,
  });
  
  di.registerDependency(FEATURE_FLAGS, {
    newCheckout: true,
    darkMode: false,
  });
  
  return <Content />;
}
```

### Register Service Instance

```tsx
function App() {
  const di = useDI();
  
  // Create and register
  const userService = di.createService(UserService);
  di.registerService(userService);
  
  return <Content />;
}
```

## Injection

### Inject Service

```typescript
class CheckoutService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(UserService) private userService: UserService,
    @inject(CartService) private cartService: CartService,
    @inject(PaymentService) private paymentService: PaymentService,
  ) {
    super(os);
  }
}
```

### Inject by Key

```typescript
class ApiService extends Service {
  private config: ApiConfig;
  
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(API_CONFIG) config: ApiConfig,
  ) {
    super(os);
    this.config = config;
  }
  
  *request(endpoint: string) {
    return yield* call(fetch, `${this.config.baseUrl}${endpoint}`);
  }
}
```

## Resolution Order

Dependencies must be registered before they are needed:

```tsx
function App() {
  const di = useDI();
  
  // 1. Register config first
  di.registerDependency(API_CONFIG, config);
  
  // 2. Register base services
  const logger = di.createService(Logger);
  di.registerService(logger);
  
  const apiService = di.createService(ApiService); // Uses API_CONFIG
  di.registerService(apiService);
  
  // 3. Register dependent services
  const userService = di.createService(UserService); // Uses ApiService
  di.registerService(userService);
  
  const orderService = di.createService(OrderService); // Uses UserService
  di.registerService(orderService);
  
  return <Content />;
}
```

## Component-Level Services

Services can be registered at different component levels:

```tsx
// App level - global services
function App() {
  const di = useDI();
  
  const authService = di.createService(AuthService);
  di.registerService(authService);
  
  return (
    <Suspense fallback={<Loader />}>
      <Router>
        <Routes>
          <Route path="/products" element={<ProductPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
      </Router>
    </Suspense>
  );
}

// Page level - page-specific services
function ProductPage() {
  const di = useDI();
  
  // ProductService only exists while on this page
  const productService = di.createService(ProductService);
  di.registerService(productService);
  
  const { operationId } = useService(productService);
  
  return (
    <Operation operationId={operationId}>
      {() => <ProductList />}
    </Operation>
  );
}
```

## Testing with DI

```typescript
// Create mock service
class MockUserService extends Dependency {
  toString() { return 'UserService'; }
  
  *fetchUser(id: string) {
    return { id, name: 'Test User' };
  }
}

// In test
const di = getDIContext();
const mockUserService = new MockUserService();
di.registerService(mockUserService);

// OrderService will receive mock
const orderService = di.createService(OrderService);
```

## Best Practices

### 1. Keep Dependencies Explicit

```typescript
// ✅ Good - explicit dependencies
class OrderService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(UserService) private users: UserService,
    @inject(InventoryService) private inventory: InventoryService,
  ) {
    super(os);
  }
}

// ❌ Bad - hidden dependencies
class OrderService extends Service {
  *createOrder() {
    const di = getGlobalDI(); // Hidden dependency
    const users = di.getService(UserService);
  }
}
```

### 2. Use Interfaces for Testing

```typescript
// Define interface
interface IUserService {
  fetchUser(id: string): Generator<any, User>;
}

// Production implementation
class UserService extends Service implements IUserService {
  *fetchUser(id: string) {
    return yield* call(api.getUser, id);
  }
}

// Test implementation
class MockUserService extends Dependency implements IUserService {
  *fetchUser(id: string) {
    return { id, name: 'Mock' };
  }
}
```

### 3. Avoid Circular Dependencies

```typescript
// ❌ Circular dependency
class ServiceA extends Service {
  constructor(@inject(ServiceB) private b: ServiceB) {}
}

class ServiceB extends Service {
  constructor(@inject(ServiceA) private a: ServiceA) {} // Error!
}

// ✅ Use events or extract shared logic
class SharedService extends Service { /* shared logic */ }

class ServiceA extends Service {
  constructor(@inject(SharedService) private shared: SharedService) {}
}

class ServiceB extends Service {
  constructor(@inject(SharedService) private shared: SharedService) {}
}
```

