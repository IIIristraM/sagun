# useDI

Provides access to the Dependency Injection container.

## Signature

```typescript
function useDI(): IDIContext;

interface IDIContext {
  // Working with Dependency/Service (classes)
  createService<T extends Dependency>(Ctr: new (...args: any[]) => T): T;
  registerService(service: Dependency): void;
  unregisterService<T extends Dependency>(Ctr: new (...args: any[]) => T): void;
  getService<T extends Dependency>(Ctr: new (...args: any[]) => T): T;
  
  // Working with DependencyKey (arbitrary data)
  registerDependency<D>(key: DependencyKey<D>, dependency: D): void;
  unregisterDependency<D>(key: DependencyKey<D>): void;
  getDependency<D>(key: DependencyKey<D>): D;
  
  // Creating actions for @daemon methods
  createServiceActions<T extends BaseService>(
    service: T, 
    bind?: Store
  ): ActionAPI<T>;
}
```

## Returns

### Working with Classes (Dependency/Service)

| Method | Description |
|--------|-------------|
| `createService(Class)` | Create instance with automatic dependency injection |
| `registerService(instance)` | Register service in the container |
| `unregisterService(Class)` | Remove service from the container |
| `getService(Class)` | Get registered service |

### Working with DependencyKey (Arbitrary Data)

| Method | Description |
|--------|-------------|
| `registerDependency(key, data)` | Register data by key |
| `unregisterDependency(key)` | Remove data by key |
| `getDependency(key)` | Get data by key |

### Actions

| Method | Description |
|--------|-------------|
| `createServiceActions(service, store?)` | Create actions for `@daemon` methods of a service |

## Description

`useDI` is the access point to Sagun's Dependency Injection system. The container stores service instances and automatically resolves dependencies during creation.

## Basic Usage

```tsx
import { useDI } from '@iiiristram/sagun';

function App() {
  const di = useDI();
  
  // Create service (dependencies are injected automatically)
  const userService = di.createService(UserService);
  
  // Register for use by others
  di.registerService(userService);
  
  // Get registered service
  const sameService = di.getService(UserService);
  console.log(userService === sameService); // true
}
```

## Registration Order

Dependencies must be registered before creating services that use them:

```tsx
function App() {
  const di = useDI();
  
  // 1. First, dependencies without dependencies
  const logger = new Logger();
  di.registerService(logger);
  
  // 2. Then services that depend on them
  const userService = di.createService(UserService);
  di.registerService(userService);
  
  // 3. And services depending on the previous ones
  const orderService = di.createService(OrderService);
  di.registerService(orderService);
}
```

## Registering Data by Key

To inject arbitrary data (not classes), use `DependencyKey`:

```tsx
import { DependencyKey } from '@iiiristram/sagun';

// Define type and key
type AppConfig = { apiUrl: string };
const CONFIG_KEY = 'APP_CONFIG' as DependencyKey<AppConfig>;

function App() {
  const di = useDI();
  
  // Register data by key
  di.registerDependency(CONFIG_KEY, { apiUrl: 'https://api.example.com' });
  
  // Get data
  const config = di.getDependency(CONFIG_KEY);
  
  // Services can inject via @inject(CONFIG_KEY)
  const service = di.createService(MyService);
}
```

## Container Scope

The container is created by the `Root` component and is available throughout the subtree:

```tsx
<Root operationService={os} componentLifecycleService={cls}>
  {/* The entire subtree uses one container */}
  <App />
</Root>
```

## See Also

- [Root](../components/root) — container provider
- [Dependency](../services/dependency) — base dependency class
- [@inject](../decorators/inject) — injection decorator
- [Dependency Injection](../../concepts/dependency-injection) — detailed guide
