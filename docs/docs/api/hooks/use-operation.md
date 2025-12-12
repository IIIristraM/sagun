# useOperation

Subscribes to operation state in Redux store.

## Signature

```typescript
function useOperation<TRes, TArgs, TMeta, TErr>(options: {
  operationId: OperationId<TRes, TArgs, TMeta, TErr>;
  defaultState?: Partial<AsyncOperation<TRes, TArgs, TMeta, TErr>>;
  suspense?: boolean;
}): Partial<AsyncOperation<TRes, TArgs, TMeta, TErr>>;
```

## Static Method

```typescript
// Configure store path (call once at app startup)
useOperation.setPath(path: (state: any) => State): void;
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `operationId` | `OperationId` | - | Operation to subscribe to |
| `defaultState` | `Partial<AsyncOperation>` | `{ isLoading: true }` | State when operation doesn't exist |
| `suspense` | `boolean` | `false` | Enable Suspense integration |

## Returns

```typescript
type AsyncOperation<TRes, TArgs, TMeta, TErr> = {
  id: OperationId;
  isLoading?: boolean;
  isError?: boolean;
  isBlocked?: boolean;
  error?: TErr;
  args?: TArgs;
  result?: TRes;
  meta?: TMeta;
};
```

## Setup

**Required:** Configure store path before using `useOperation`:

```typescript
// bootstrap.ts
import { useOperation } from '@iiiristram/sagun';

useOperation.setPath(state => state.asyncOperations);
```

## Basic Usage

```tsx
function UserCard() {
  const { service } = useServiceConsumer(UserService);
  
  const operation = useOperation({
    operationId: getId(service.fetchUser),
  });

  if (operation.isLoading) return <Spinner />;
  if (operation.isError) return <Error error={operation.error} />;
  
  return <Card user={operation.result} />;
}
```

## With Suspense

When `suspense: true`:
- Throws Promise while `isLoading` (caught by Suspense boundary)
- Throws error if `isError` (caught by ErrorBoundary)

```tsx
function UserCard() {
  const { service } = useServiceConsumer(UserService);
  
  // Will suspend while loading
  const operation = useOperation({
    operationId: getId(service.fetchUser),
    suspense: true,
  });

  // Only renders when complete
  return <Card user={operation.result} />;
}

// Parent must have Suspense
function Parent() {
  return (
    <Suspense fallback={<Spinner />}>
      <UserCard />
    </Suspense>
  );
}
```

## Custom Default State

```tsx
const operation = useOperation({
  operationId: getId(service.fetchItems),
  defaultState: { 
    isLoading: false,
    result: [] // Default to empty array
  },
});
```

## Getting Operation ID

From service method decorated with `@operation`:

```tsx
import { getId } from '@iiiristram/sagun';

const operationId = getId(service.fetchUser);
```

From `useSaga` or `useService`:

```tsx
const { operationId } = useSaga({ id: 'my-saga', onLoad: ... });
const { operationId } = useService(service);
```

## See Also

- [Operation component](../components/operation) - Component wrapper
- [@operation](../decorators/operation) - Operation decorator
- [useSaga](./use-saga) - Get operationId from saga

