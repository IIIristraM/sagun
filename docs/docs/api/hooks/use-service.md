# useService

Initializes a service and manages its lifecycle.

## Signature

```typescript
// Single service
function useService<TArgs extends any[], TRes>(
  service: BaseService<TArgs, TRes>,
  args?: TArgs,
  options?: UseSagaOptions<TArgs, TRes>
): UseSagaOutput<TRes, TArgs>;

// Array of services (all receive the same args)
function useService<TArgs extends any[], TRes>(
  services: Array<BaseService<TArgs, any>>,
  args?: TArgs,
  options?: UseSagaOptions<TArgs, TRes>
): UseSagaOutput<TRes, TArgs>;

type UseSagaOutput<TRes, TArgs> = {
  operationId: OperationId<TRes, TArgs>;
  reload: () => void;
};
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `service` | `BaseService \| BaseService[]` | Service or array of services to initialize |
| `args` | `TArgs` | Arguments for `service.run()` (default `[]`) |
| `options.operationOptions.updateStrategy` | `function?` | Operation update strategy |

## Returns

| Property | Type | Description |
|----------|------|-------------|
| `operationId` | `OperationId` | ID of the initialization operation |
| `reload` | `() => void` | Function to force restart |

## Description

`useService` manages the service lifecycle:

1. **On mount** — calls `service.run(...args)`
2. **On args change** — calls `service.destroy()`, then `service.run()` with new args
3. **On unmount** — calls `service.destroy()`

## Basic Usage

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
        {() => <ProductList service={service} />}
      </Operation>
    </Suspense>
  );
}
```

## With Multiple Arguments

```tsx
function FilteredProducts({ categoryId, sortBy, filters }) {
  const di = useDI();
  const service = di.createService(ProductService);
  di.registerService(service);
  
  // Service will restart when any argument changes
  const { operationId } = useService(service, [categoryId, sortBy, filters]);
  
  return (
    <Operation operationId={operationId}>
      {() => <ProductGrid />}
    </Operation>
  );
}
```

## Service with Dependencies

```tsx
function OrderPage() {
  const di = useDI();
  
  // First register dependencies
  const userService = di.createService(UserService);
  const cartService = di.createService(CartService);
  di.registerService(userService);
  di.registerService(cartService);
  
  // Then create the service that depends on them
  const orderService = di.createService(OrderService);
  di.registerService(orderService);
  
  const { operationId } = useService(orderService, []);
  
  return (
    <Operation operationId={operationId}>
      {() => <OrderForm service={orderService} />}
    </Operation>
  );
}
```

## Initializing Multiple Services

You can initialize multiple services at once:

```tsx
function Dashboard() {
  const di = useDI();
  
  const userService = di.createService(UserService);
  const statsService = di.createService(StatsService);
  const notificationService = di.createService(NotificationService);
  
  di.registerService(userService);
  di.registerService(statsService);
  di.registerService(notificationService);
  
  // All services initialize in parallel
  const { operationId } = useService(
    [userService, statsService, notificationService],
    []
  );
  
  return (
    <Operation operationId={operationId}>
      {() => <DashboardContent />}
    </Operation>
  );
}
```

## With Reload

```tsx
function RefreshableData() {
  const di = useDI();
  const service = di.createService(DataService);
  di.registerService(service);
  
  const { operationId, reload } = useService(service, []);
  
  return (
    <div>
      <button onClick={reload}>Refresh data</button>
      <Operation operationId={operationId}>
        {() => <DataView />}
      </Operation>
    </div>
  );
}
```

## Nested Services Pattern

```tsx
function App() {
  const di = useDI();
  
  // Global service
  const authService = di.createService(AuthService);
  di.registerService(authService);
  
  return (
    <AuthProvider service={authService}>
      <ProductPage />
    </AuthProvider>
  );
}

function ProductPage() {
  const di = useDI();
  
  // Local service for this page
  // AuthService is already available for injection
  const productService = di.createService(ProductService);
  di.registerService(productService);
  
  const { operationId } = useService(productService, []);
  // ...
}
```

## See Also

- [Service](../services/service) — service class
- [useSaga](./use-saga) — for simple sagas without a service
- [useDI](./use-di) — working with the DI container
