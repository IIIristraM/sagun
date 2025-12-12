# useSaga

Binds saga execution to component lifecycle.

## Signature

```typescript
function useSaga<TArgs extends any[], TRes>(
  saga: {
    id: string;
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

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `saga.id` | `string` | **Required.** Unique ID for Suspense compatibility |
| `saga.onLoad` | `Generator` | Executes on render and when args change |
| `saga.onDispose` | `Generator` | Executes before next onLoad and on unmount |
| `args` | `TArgs` | Arguments passed to onLoad/onDispose |
| `options.operationOptions.updateStrategy` | `Function` | Custom operation update logic |

## Returns

| Property | Type | Description |
|----------|------|-------------|
| `operationId` | `OperationId` | ID to subscribe to results via `useOperation` |
| `reload` | `() => void` | Force re-execution of onLoad |

## Basic Usage

```tsx
function UserProfile({ userId }) {
  const { operationId } = useSaga({
    id: `user-${userId}`,
    onLoad: function* () {
      yield* call(api.fetchUser, userId);
    },
  }, [userId]);

  return (
    <Operation operationId={operationId}>
      {() => <ProfileContent />}
    </Operation>
  );
}
```

## With onDispose

```tsx
function DataView({ id }) {
  const { operationId } = useSaga({
    id: `data-${id}`,
    onLoad: function* (dataId) {
      console.log('Loading data:', dataId);
      yield* call(api.fetchData, dataId);
    },
    onDispose: function* (dataId) {
      console.log('Cleaning up:', dataId);
      yield* call(api.clearCache, dataId);
    },
  }, [id]);

  // When id changes:
  // 1. Current onLoad is cancelled
  // 2. onDispose runs with old id
  // 3. onLoad runs with new id
}
```

## With Service Methods

```tsx
function ProductPage({ categoryId }) {
  const { service } = useServiceConsumer(ProductService);
  
  const { operationId, reload } = useSaga({
    id: `products-${categoryId}`,
    onLoad: function* (catId) {
      yield* call(service.fetchProducts, catId);
      yield* call(service.fetchFilters, catId);
    },
  }, [categoryId]);

  return (
    <div>
      <button onClick={reload}>Refresh</button>
      <Operation operationId={operationId}>
        {() => <ProductList />}
      </Operation>
    </div>
  );
}
```

## Important Notes

### ID is Required

The `id` parameter is **required** for React Suspense compatibility:

```tsx
// ✅ Good
useSaga({ id: 'unique-id', onLoad: ... });

// ✅ Good - dynamic ID
useSaga({ id: `item-${itemId}`, onLoad: ... }, [itemId]);
```

### Lifecycle Guarantees

- If `onLoad` is cancelled mid-execution, `onDispose` will be called
- `onDispose` always completes fully before next `onLoad` starts
- Multiple rapid changes result in single `onLoad` with latest args

### Execution Timing

`useSaga` executes in a `useMemo`-like way (on render), not in `useEffect`:

```tsx
function Component() {
  // onLoad starts during render, not after commit
  const { operationId } = useSaga({
    id: 'my-saga',
    onLoad: function* () {
      // This runs immediately during render
    },
  });
}
```

## See Also

- [useService](./use-service) - Shortcut for service initialization
- [useOperation](./use-operation) - Subscribe to operation state
- [Operation](../components/operation) - Render operation state

