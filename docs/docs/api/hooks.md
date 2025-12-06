# Hooks API

## useSaga

Binds saga execution to component lifecycle. Executes in a `useMemo`-like way.

### Signature

```typescript
function useSaga<TArgs extends any[], TRes>(
  saga: {
    id: string;                        // Required unique ID
    onLoad?: (...args: TArgs) => Generator<any, TRes>;
    onDispose?: (...args: TArgs) => Generator<any, void>;
  },
  args?: TArgs,
  options?: {
    operationOptions?: {
      updateStrategy?: IOperationUpdateStrategy<TRes, TArgs>;
    };
  }
): {
  operationId: OperationId<TRes, TArgs>;
  reload: () => void;
};
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `saga.id` | `string` | **Required.** Unique ID for Suspense compatibility |
| `saga.onLoad` | `Generator` | Executes on render and when args change |
| `saga.onDispose` | `Generator` | Executes before next onLoad and on unmount |
| `args` | `TArgs` | Arguments passed to onLoad/onDispose |
| `options` | `object` | Additional options |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `operationId` | `OperationId` | ID to subscribe to results |
| `reload` | `() => void` | Force re-execution |

### Example

```tsx
function UserProfile({ userId }) {
  const { service } = useServiceConsumer(UserService);
  
  const { operationId, reload } = useSaga({
    id: `user-profile-${userId}`,
    onLoad: function* (id) {
      yield* call(service.fetchUser, id);
      yield* call(service.fetchUserPosts, id);
    },
    onDispose: function* (id) {
      yield* call(service.clearUserCache, id);
    },
  }, [userId]);

  return (
    <Operation operationId={operationId}>
      {() => (
        <div>
          <button onClick={reload}>Refresh</button>
          <ProfileContent />
        </div>
      )}
    </Operation>
  );
}
```

### Important Notes

- `id` is **required** for React Suspense compatibility
- If `onLoad` is cancelled mid-execution, `onDispose` will be called
- `onDispose` completes fully before next `onLoad` starts

## useService

Shortcut for initializing a service with lifecycle management.

### Signature

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

### Example

```tsx
function ProductPage({ categoryId }) {
  const di = useDI();
  const service = di.createService(ProductService);
  di.registerService(service);
  
  const { operationId } = useService(service, [categoryId]);
  
  return (
    <Operation operationId={operationId}>
      {() => <ProductList />}
    </Operation>
  );
}
```

Equivalent to:

```tsx
const { operationId } = useSaga({
  id: `init-${service.toString()}`,
  onLoad: service.run,
  onDispose: service.destroy,
}, [categoryId]);
```

## useOperation

Subscribes to operation state in Redux store.

### Signature

```typescript
function useOperation<TRes, TArgs, TMeta, TErr>(options: {
  operationId: OperationId<TRes, TArgs, TMeta, TErr>;
  defaultState?: Partial<AsyncOperation<TRes, TArgs, TMeta, TErr>>;
  suspense?: boolean;
}): Partial<AsyncOperation<TRes, TArgs, TMeta, TErr>>;

// Static method to configure store path
useOperation.setPath(path: (state: any) => State): void;
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `operationId` | `OperationId` | - | Operation to subscribe to |
| `defaultState` | `Partial<AsyncOperation>` | `{ isLoading: true }` | Default state when operation doesn't exist |
| `suspense` | `boolean` | `false` | Enable Suspense integration |

### Setup

```typescript
// Must be called before using useOperation
useOperation.setPath(state => state.asyncOperations);
```

### Examples

```tsx
// Basic usage
function UserCard() {
  const { service } = useServiceConsumer(UserService);
  
  const operation = useOperation({
    operationId: getId(service.fetchUser),
  });

  if (operation.isLoading) return <Spinner />;
  if (operation.isError) return <Error error={operation.error} />;
  
  return <Card user={operation.result} />;
}

// With Suspense
function UserCard() {
  const { service } = useServiceConsumer(UserService);
  
  // Throws Promise while loading (caught by Suspense)
  // Throws error if failed (caught by ErrorBoundary)
  const operation = useOperation({
    operationId: getId(service.fetchUser),
    suspense: true,
  });

  return <Card user={operation.result} />;
}
```

## useServiceConsumer

Retrieves registered service and creates bound actions.

### Signature

```typescript
function useServiceConsumer<T extends BaseService>(
  ServiceClass: new (...args: any[]) => T
): {
  service: T;
  actions: ActionAPI<T>;
};
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `service` | `T` | Service instance |
| `actions` | `ActionAPI<T>` | Bound action creators for @daemon methods |

### Example

```tsx
function SearchForm() {
  const { service, actions } = useServiceConsumer(SearchService);
  
  // Access service directly
  const searchId = getId(service.search);
  
  // Call daemon methods via actions
  const handleSearch = (query: string) => {
    actions.search(query); // Dispatches Redux action
  };

  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

## useDI

Returns the Dependency Injection context.

### Signature

```typescript
function useDI(): IDIContext;

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

### Methods

| Method | Description |
|--------|-------------|
| `registerDependency(key, value)` | Register dependency by key |
| `getDependency(key)` | Get dependency by key |
| `registerService(service)` | Register service instance |
| `createService(Class)` | Create service with resolved dependencies |
| `getService(Class)` | Get registered service by class |
| `createServiceActions(service, store?)` | Create action creators |

### Example

```tsx
function App() {
  const di = useDI();
  
  // Register config
  di.registerDependency(API_CONFIG, { baseUrl: '/api' });
  
  // Create and register services
  const userService = di.createService(UserService);
  di.registerService(userService);
  
  // OrderService can now inject UserService
  const orderService = di.createService(OrderService);
  di.registerService(orderService);
  
  return <Content />;
}
```

