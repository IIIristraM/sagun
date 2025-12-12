# useService

Shortcut for initializing a service with lifecycle management.

## Signature

```typescript
function useService<TArgs extends any[], TRes>(
  service: BaseService<TArgs, TRes>,
  args?: TArgs,
  options?: UseSagaOptions<TArgs, TRes>
): {
  operationId: OperationId<TRes, TArgs>;
  reload: () => void;
};
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `service` | `BaseService` | Service instance to initialize |
| `args` | `TArgs` | Arguments passed to `service.run()` |
| `options` | `UseSagaOptions` | Additional options |

## Returns

| Property | Type | Description |
|----------|------|-------------|
| `operationId` | `OperationId` | ID to subscribe to initialization result |
| `reload` | `() => void` | Force re-initialization |

## Basic Usage

```tsx
function ProductPage() {
  const di = useDI();
  const service = di.createService(ProductService);
  di.registerService(service);
  
  const { operationId } = useService(service);
  
  return (
    <Suspense fallback={<Spinner />}>
      <Operation operationId={operationId}>
        {() => <ProductList />}
      </Operation>
    </Suspense>
  );
}
```

## With Arguments

```tsx
function CategoryPage({ categoryId }) {
  const di = useDI();
  const service = di.createService(ProductService);
  di.registerService(service);
  
  // Pass categoryId to service.run()
  const { operationId } = useService(service, [categoryId]);
  
  return (
    <Operation operationId={operationId}>
      {() => <ProductList />}
    </Operation>
  );
}
```

## Equivalent to useSaga

`useService(service, args)` is equivalent to:

```tsx
useSaga({
  id: `init-${service.toString()}`,
  onLoad: service.run,
  onDispose: service.destroy,
}, args);
```

## Lifecycle

When `useService` is called:

1. `service.run(...args)` is executed
2. Service status becomes `'ready'`
3. On unmount or args change, `service.destroy(...args)` is called
4. Service status becomes `'unavailable'`

## Complete Example

```tsx
function UserDashboard({ userId }) {
  const di = useDI();
  
  // Create services
  const userService = di.createService(UserService);
  const statsService = di.createService(StatsService);
  
  // Register for DI
  di.registerService(userService);
  di.registerService(statsService);
  
  // Initialize with userId
  const { operationId: userOpId } = useService(userService, [userId]);
  const { operationId: statsOpId } = useService(statsService, [userId]);
  
  return (
    <Suspense fallback={<PageLoader />}>
      <Operation operationId={userOpId}>
        {() => (
          <>
            <UserProfile />
            <Operation operationId={statsOpId}>
              {() => <UserStats />}
            </Operation>
          </>
        )}
      </Operation>
    </Suspense>
  );
}
```

## See Also

- [useSaga](./use-saga) - General saga hook
- [Service](../services/service) - Service class
- [useServiceConsumer](./use-service-consumer) - Get service in child components

