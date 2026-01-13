# useOperation

Subscribes to operation state.

## Signature

```typescript
function useOperation<TRes, TArgs = any, TMeta = never, TErr = Error>(
  options: {
    operationId: OperationId<TRes, TArgs, TMeta, TErr>;
    defaultState?: Partial<AsyncOperation<TRes, TArgs, TMeta, TErr>>;
    suspense?: boolean;
  }
): Partial<AsyncOperation<TRes, TArgs, TMeta, TErr>>;

// Static method — must be called before usage
useOperation.setPath(path: (state: any) => State): void;
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.operationId` | `OperationId` | — | Operation ID to subscribe to |
| `options.defaultState` | `Partial<AsyncOperation>` | `{ isLoading: true }` | Default state if operation doesn't exist in store |
| `options.suspense` | `boolean` | `false` | React Suspense integration |

## Returns

`AsyncOperation` object:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `OperationId` | Operation ID |
| `isLoading` | `boolean?` | Operation is in progress |
| `isError` | `boolean?` | Operation completed with error |
| `isBlocked` | `boolean?` | Operation is blocked |
| `error` | `TErr?` | Error if occurred |
| `result` | `TRes?` | Operation result |
| `args` | `TArgs?` | Arguments the operation was called with |
| `meta` | `TMeta?` | Additional metadata |

## Description

`useOperation` subscribes to an operation in the Redux store and returns its current state. The component re-renders when the state changes.

:::warning Path Configuration
Before using, you must specify the path to operations in the store:

```typescript
// bootstrap.ts
useOperation.setPath(state => state.asyncOperations);
```
:::

## Basic Usage

```tsx
import { useSaga, useOperation } from '@iiiristram/sagun';

function UserProfile({ userId }) {
  const { operationId } = useSaga({
    id: `user-${userId}`,
    onLoad: function* () {
      return yield* call(api.getUser, userId);
    }
  }, [userId]);

  const operation = useOperation({ operationId });

  if (operation.isLoading) {
    return <Spinner />;
  }

  if (operation.isError) {
    return <ErrorMessage error={operation.error} />;
  }

  return <div>Hello, {operation.result?.name}!</div>;
}
```

## With Service Operation

```tsx
import { useOperation, useServiceConsumer, getId } from '@iiiristram/sagun';

function UserActions() {
  const { service, actions } = useServiceConsumer(UserService);
  
  // Get operation ID by method
  const operationId = getId(service.fetchUser);
  const operation = useOperation({ operationId });

  if (operation.isLoading) {
    return <Button disabled>Loading...</Button>;
  }

  return (
    <Button onClick={() => actions.fetchUser()}>
      Refresh
    </Button>
  );
}
```

## With Suspense

```tsx
function UserData({ userId }) {
  const { operationId } = useSaga({
    id: `user-data-${userId}`,
    onLoad: function* () {
      return yield* call(api.getUser, userId);
    }
  }, [userId]);

  // suspense: true — component "suspends" while isLoading
  const operation = useOperation({ operationId, suspense: true });

  // We only get here when data is ready
  return <div>{operation.result?.name}</div>;
}

function Parent() {
  return (
    <Suspense fallback={<Spinner />}>
      <UserData userId="123" />
    </Suspense>
  );
}
```

## With defaultState

```tsx
function OptionalData({ operationId }) {
  const operation = useOperation({
    operationId,
    // Default state if operation doesn't exist in store
    defaultState: { 
      isLoading: false, 
      result: [] 
    }
  });

  return <List items={operation.result ?? []} />;
}
```

## useOperation vs Operation Component

`useOperation` and `Operation` solve the same problem in different ways:

```tsx
// useOperation — manual control
function WithHook({ operationId }) {
  const op = useOperation({ operationId });
  
  if (op.isLoading) return <Spinner />;
  if (op.isError) return <Error error={op.error} />;
  return <Data result={op.result} />;
}

// useOperation with Suspense
function WithHookSuspense({ operationId }) {
  const op = useOperation({ operationId, suspense: true });
  return <Data result={op.result} />;
}

// Operation — declarative approach with Suspense
function WithComponent({ operationId }) {
  return (
    <Suspense fallback={<Spinner />}>
      <Operation operationId={operationId}>
        {(op) => <Data result={op.result} />}
      </Operation>
    </Suspense>
  );
}
```

Use `useOperation` when:
- You need access to `isLoading`/`isError` in component logic
- You need custom `defaultState`
- You need to handle states in a special way

Use `Operation` when:
- You're using Suspense
- Simply displaying the result is sufficient

## See Also

- [Operation](../components/operation) — display component
- [useSaga](./use-saga) — running sagas
- [AsyncOperation](../../concepts/operations) — operation structure
