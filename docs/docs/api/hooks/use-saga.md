# useSaga

Runs a saga bound to component lifecycle.

## Signature

```typescript
function useSaga<TRes, TArgs extends any[]>(
  saga: {
    id: string;
    onLoad?: (...args: TArgs) => Generator<any, TRes>;
    onDispose?: (...args: TArgs) => Generator<any, void>;
  },
  args: TArgs,
  options?: {
    operationOptions?: {
      updateStrategy: (operation: AsyncOperation) => AsyncOperation;
    };
  }
): {
  operationId: OperationId<TRes, TArgs>;
  reload: () => void;
};
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `saga.id` | `string` | **Required** operation ID (must be unique per component instance) |
| `saga.onLoad` | `Saga?` | Saga executed on mount and when args change |
| `saga.onDispose` | `Saga?` | Cleanup saga, executed before next onLoad or unmount |
| `args` | `TArgs` | Dependency array (like in useEffect) |
| `options.operationOptions.updateStrategy` | `function?` | Function to modify operation before saving |

## Returns

| Field | Type | Description |
|-------|------|-------------|
| `operationId` | `OperationId` | ID for subscribing via useOperation or Operation |
| `reload` | `() => void` | Function to force saga restart |

## Description

`useSaga` is the primary way to run async logic in components:

1. **On mount** — `onLoad` executes
2. **On args change** — current `onLoad` is cancelled, `onDispose` executes, then new `onLoad`
3. **On unmount** — `onLoad` is cancelled, `onDispose` executes

## Basic Usage

```tsx
import { useSaga, Operation } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

function UserProfile({ userId }) {
  const { operationId } = useSaga({
    id: `user-profile-${userId}`,
    onLoad: function* () {
      return yield* call(api.getUser, userId);
    }
  }, [userId]);

  return (
    <Suspense fallback={<Spinner />}>
      <Operation operationId={operationId}>
        {(op) => <div>{op.result?.name}</div>}
      </Operation>
    </Suspense>
  );
}
```

## With Cleanup

```tsx
function LiveData({ streamId }) {
  const { operationId } = useSaga({
    id: `live-data-${streamId}`,
    onLoad: function* () {
      const subscription = yield* call(api.subscribe, streamId);
      return subscription;
    },
    onDispose: function* () {
      yield* call(api.unsubscribe, streamId);
    }
  }, [streamId]);

  return (
    <Operation operationId={operationId}>
      {(op) => <DataView data={op.result} />}
    </Operation>
  );
}
```

## With Forced Reload

```tsx
function DataWithRefresh({ id }) {
  const { operationId, reload } = useSaga({
    id: `data-${id}`,
    onLoad: function* () {
      return yield* call(api.getData, id);
    }
  }, [id]);

  return (
    <div>
      <button onClick={reload}>Refresh</button>
      <Operation operationId={operationId}>
        {(op) => <div>{op.result}</div>}
      </Operation>
    </div>
  );
}
```

## With updateStrategy

Use `updateStrategy` to modify operation before saving (e.g., for pagination):

```tsx
import { select } from 'typed-redux-saga';

function PaginatedList({ page }) {
  const { operationId } = useSaga({
    id: 'paginated-list',
    onLoad: function* (pageNum) {
      return yield* call(api.getItems, pageNum);
    }
  }, [page], {
    operationOptions: {
      updateStrategy: function* (next) {
        // Get previous state
        const prev = yield* select(state => 
          state.asyncOperations.get(next.id)
        );
        
        // Merge results
        return {
          ...next,
          result: prev?.result && next.result 
            ? [...prev.result, ...next.result] 
            : next.result || prev?.result,
        };
      }
    }
  });

  return (
    <Operation operationId={operationId}>
      {(op) => <ItemList items={op.result} />}
    </Operation>
  );
}
```

## Important Notes

- `id` **is required** — must be unique per component instance (e.g., `item-${id}` for list items)
- `onLoad` **is cancelled** on args change or unmount
- `onDispose` **runs to completion** (not cancelled)
- Use `try/finally` in `onLoad` for guaranteed cleanup on cancellation

:::note Why is id required?
Starting from React v18, Suspense behavior changed — React may reset component state.
A stable `id` is necessary for correct operation. See [React issue #24669](https://github.com/facebook/react/issues/24669).
:::

## useSagaUnsafe (deprecated)

For backward compatibility, `useSagaUnsafe` is available where `id` is optional:

```tsx
import { useSagaUnsafe } from '@iiiristram/sagun';

// id is optional, but not recommended for new components
const { operationId } = useSagaUnsafe({
  onLoad: function* () {
    return yield* call(api.getData);
  }
}, []);
```

:::warning
`useSagaUnsafe` is marked as deprecated. Use `useSaga` with required `id`.
:::

## See Also

- [useOperation](./use-operation) — subscribing to operation
- [Operation](../components/operation) — display component
- [useService](./use-service) — for complex logic use services
