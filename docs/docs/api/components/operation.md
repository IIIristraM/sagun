# Operation

Component for displaying operation state with Suspense support.

## Signature

```tsx
function Operation<TResult>(props: {
  operationId: string;
  children: (operation: AsyncOperation<TResult>) => ReactNode;
}): JSX.Element;
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `operationId` | `string` | Operation ID |
| `children` | `Function` | Render function receiving operation state |

## Description

`Operation` is a component that:

1. **Subscribes to an operation** — similar to `useOperation`
2. **Integrates with Suspense** — throws Promise while the operation is loading
3. **Propagates errors** — can be caught via Error Boundary

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

## Operation vs useOperation

| | Operation | useOperation |
|-|-----------|--------------|
| Suspense | ✅ Built-in support | ✅ Via `suspense: true` option |
| Error Boundary | ✅ Propagates errors | ✅ Via `suspense: true` option |
| Access to isLoading | ❌ Hidden by Suspense | ✅ Full access |
| Flexibility | Declarative | Imperative |

## See Also

- [useOperation](../hooks/use-operation) — hook for subscription
- [useSaga](../hooks/use-saga) — running sagas
- [AsyncOperation](../../concepts/operations) — operation structure

