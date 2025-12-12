# Operation

Component wrapper for `useOperation` with Suspense support.

## Props

```typescript
interface OperationProps<TRes, TArgs> {
  operationId: OperationId<TRes, TArgs>;
  children: (operation: Partial<AsyncOperation<TRes, TArgs>>) => React.ReactNode;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `operationId` | `OperationId` | Operation to subscribe to |
| `children` | `Function` | Render function receiving operation state |

## Basic Usage

```tsx
import { Operation, useSaga } from '@iiiristram/sagun';

function UserPage() {
  const { operationId } = useSaga({
    id: 'load-user',
    onLoad: function* () {
      yield* call(api.fetchUser);
    },
  });

  return (
    <Suspense fallback={<Spinner />}>
      <Operation operationId={operationId}>
        {(operation) => (
          <div>
            <h1>{operation.result?.name}</h1>
            {operation.isLoading && <span>Updating...</span>}
          </div>
        )}
      </Operation>
    </Suspense>
  );
}
```

## With Service Method

```tsx
function ProductDetails({ productId }) {
  const { service } = useServiceConsumer(ProductService);
  
  useSaga({
    id: `product-${productId}`,
    onLoad: function* () {
      yield* call(service.fetchProduct, productId);
    },
  }, [productId]);

  return (
    <Suspense fallback={<Spinner />}>
      <Operation operationId={getId(service.fetchProduct)}>
        {({ result: product }) => (
          <div>
            <h1>{product?.name}</h1>
            <p>{product?.description}</p>
            <span>${product?.price}</span>
          </div>
        )}
      </Operation>
    </Suspense>
  );
}
```

## Nested Operations

```tsx
function Dashboard() {
  const { service: userService } = useServiceConsumer(UserService);
  const { service: statsService } = useServiceConsumer(StatsService);

  return (
    <Suspense fallback={<PageLoader />}>
      <Operation operationId={getId(userService.fetchUser)}>
        {({ result: user }) => (
          <div>
            <h1>Welcome, {user?.name}</h1>
            
            <Suspense fallback={<StatsLoader />}>
              <Operation operationId={getId(statsService.fetchStats)}>
                {({ result: stats }) => (
                  <StatsPanel stats={stats} />
                )}
              </Operation>
            </Suspense>
          </div>
        )}
      </Operation>
    </Suspense>
  );
}
```

## Operation State

The render function receives:

```typescript
{
  id: OperationId;
  isLoading?: boolean;   // Operation in progress
  isError?: boolean;     // Operation failed
  isBlocked?: boolean;   // Operation blocked
  error?: Error;         // Error if failed
  args?: TArgs;          // Arguments passed
  result?: TRes;         // Result if complete
  meta?: TMeta;          // Additional metadata
}
```

## Handling States Manually

If you need more control than Suspense provides:

```tsx
<Operation operationId={operationId}>
  {(operation) => {
    if (operation.isLoading) {
      return <Spinner />;
    }
    
    if (operation.isError) {
      return <Error message={operation.error?.message} />;
    }
    
    if (!operation.result) {
      return <Empty />;
    }
    
    return <Content data={operation.result} />;
  }}
</Operation>
```

## Suspense Behavior

`Operation` uses `useOperation` with `suspense: true`:
- Throws Promise while loading (caught by nearest Suspense)
- Throws error on failure (caught by nearest ErrorBoundary)

Always wrap in `Suspense`:

```tsx
// ✅ Correct
<Suspense fallback={<Spinner />}>
  <Operation operationId={operationId}>
    {/* ... */}
  </Operation>
</Suspense>

// ❌ Will crash if no Suspense boundary
<Operation operationId={operationId}>
  {/* ... */}
</Operation>
```

## See Also

- [useOperation](../hooks/use-operation) - Hook version
- [useSaga](../hooks/use-saga) - Get operation ID
- [@operation](../decorators/operation) - Create operations

