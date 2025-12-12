# useDI

Returns the Dependency Injection context.

## Signature

```typescript
function useDI(): IDIContext;
```

## Returns

```typescript
interface IDIContext {
  registerDependency<D>(key: DependencyKey<D>, dependency: D): void;
  getDependency<D>(key: DependencyKey<D>): D;
  registerService(service: Dependency): void;
  createService<T extends Dependency>(Ctr: Ctr<T>): T;
  getService<T extends Dependency>(Ctr: Ctr<T>): T;
  createServiceActions<T extends BaseService>(
    service: T, 
    store?: Store
  ): ActionAPI<T>;
}
```

## Methods

| Method | Description |
|--------|-------------|
| `registerDependency(key, value)` | Register dependency by string key |
| `getDependency(key)` | Get dependency by string key |
| `registerService(service)` | Register service instance by its `toString()` |
| `createService(Class)` | Create service, resolving `@inject` dependencies |
| `getService(Class)` | Get registered service by class |
| `createServiceActions(service, store?)` | Create action creators for `@daemon` methods |

## Basic Usage

```tsx
function App() {
  const di = useDI();
  
  // Create and register service
  const userService = di.createService(UserService);
  di.registerService(userService);
  
  return <Content />;
}
```

## registerDependency / getDependency

For non-class dependencies:

```tsx
import { DependencyKey } from '@iiiristram/sagun';

const API_CONFIG = 'API_CONFIG' as DependencyKey<{
  baseUrl: string;
}>;

function App() {
  const di = useDI();
  
  // Register
  di.registerDependency(API_CONFIG, { baseUrl: '/api' });
  
  // Later, anywhere
  const config = di.getDependency(API_CONFIG);
}
```

## createService

Creates service instance, automatically resolving `@inject` dependencies:

```tsx
function App() {
  const di = useDI();
  
  // UserService has no dependencies beyond OperationService
  const userService = di.createService(UserService);
  di.registerService(userService);
  
  // OrderService depends on UserService
  // createService will inject it automatically
  const orderService = di.createService(OrderService);
  di.registerService(orderService);
}
```

## getService

Retrieve previously registered service:

```tsx
function ChildComponent() {
  const di = useDI();
  
  // Get service registered by parent
  const userService = di.getService(UserService);
}
```

## Complete Example

```tsx
function App() {
  const di = useDI();
  
  // 1. Register config
  di.registerDependency(API_CONFIG, {
    baseUrl: process.env.API_URL,
    timeout: 5000,
  });
  
  // 2. Create base services
  const logger = di.createService(LoggerService);
  di.registerService(logger);
  
  const apiService = di.createService(ApiService);
  di.registerService(apiService);
  
  // 3. Create dependent services
  const userService = di.createService(UserService);
  di.registerService(userService);
  
  const orderService = di.createService(OrderService);
  di.registerService(orderService);
  
  return (
    <Router>
      <Routes>
        <Route path="/user" element={<UserPage />} />
        <Route path="/orders" element={<OrdersPage />} />
      </Routes>
    </Router>
  );
}
```

## See Also

- [Dependency Injection Guide](../../advanced/dependency-injection) - Full guide
- [@inject](../decorators/inject) - Injection decorator
- [useServiceConsumer](./use-service-consumer) - Get service and actions

