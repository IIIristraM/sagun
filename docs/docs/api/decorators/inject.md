# @inject

Marks constructor parameter for dependency injection.

## Signature

```typescript
@inject(key: Ctr<Dependency> | DependencyKey<T>)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `Ctr<Dependency>` | Class constructor to inject |
| `key` | `DependencyKey<T>` | String key for non-class dependencies |

## Inject by Class

Most common usage - inject another service:

```typescript
class OrderService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(UserService) private userService: UserService,
    @inject(CartService) private cartService: CartService,
  ) {
    super(os);
  }

  *createOrder() {
    const user = yield* call(this.userService.getCurrentUser);
    const cart = yield* call(this.cartService.getCart);
    return yield* call(api.createOrder, { user, cart });
  }
}
```

## Inject by Key

For non-class dependencies like configuration:

```typescript
import { DependencyKey } from '@iiiristram/sagun';

// Define typed key
const API_CONFIG = 'API_CONFIG' as DependencyKey<{
  baseUrl: string;
  timeout: number;
}>;

class ApiService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(API_CONFIG) private config: { baseUrl: string; timeout: number },
  ) {
    super(os);
  }

  *request(endpoint: string) {
    return yield* call(fetch, `${this.config.baseUrl}${endpoint}`, {
      timeout: this.config.timeout,
    });
  }
}
```

## Registration

Dependencies must be registered before services that need them:

```tsx
function App() {
  const di = useDI();
  
  // 1. Register config
  di.registerDependency(API_CONFIG, {
    baseUrl: '/api/v2',
    timeout: 5000,
  });
  
  // 2. Register base services (no dependencies)
  const userService = di.createService(UserService);
  di.registerService(userService);
  
  // 3. Register dependent services
  // OrderService can now inject UserService
  const orderService = di.createService(OrderService);
  di.registerService(orderService);
  
  return <Content />;
}
```

## Always Inject OperationService

All services extending `Service` must inject `OperationService` as the first parameter:

```typescript
class MyService extends Service {
  constructor(
    @inject(OperationService) os: OperationService, // Required first
    @inject(OtherService) private other: OtherService,
  ) {
    super(os); // Pass to parent
  }
}
```

## See Also

- [Dependency Injection Guide](../../advanced/dependency-injection) - Full DI guide
- [Dependency](../services/dependency) - Base dependency class
- [useDI](../hooks/use-di) - DI context hook

