# useServiceConsumer

Retrieves registered service and creates bound actions.

## Signature

```typescript
function useServiceConsumer<T extends BaseService>(
  ServiceClass: new (...args: any[]) => T
): {
  service: T;
  actions: ActionAPI<T>;
};
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `ServiceClass` | `Constructor` | Service class (not instance) |

## Returns

| Property | Type | Description |
|----------|------|-------------|
| `service` | `T` | Registered service instance |
| `actions` | `ActionAPI<T>` | Bound action creators for `@daemon` methods |

## Basic Usage

```tsx
function ProductList() {
  const { service, actions } = useServiceConsumer(ProductService);
  
  // Access service for operation IDs
  const operation = useOperation({
    operationId: getId(service.fetchProducts),
  });
  
  // Call daemon methods via actions
  const handleRefresh = () => {
    actions.fetchProducts();
  };
  
  return (
    <div>
      <button onClick={handleRefresh}>Refresh</button>
      <ul>
        {operation.result?.map(product => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Actions Usage

Actions are automatically created for methods decorated with `@daemon`:

```typescript
class SearchService extends Service {
  toString() { return 'SearchService'; }

  @daemon(DaemonMode.Last)
  *search(query: string) {
    return yield* call(api.search, query);
  }

  @daemon()
  *clearResults() {
    // ...
  }

  // No @daemon - won't have action
  @operation
  *getHistory() {
    return yield* call(api.getHistory);
  }
}
```

```tsx
function SearchForm() {
  const { actions } = useServiceConsumer(SearchService);
  
  return (
    <>
      <input onChange={(e) => actions.search(e.target.value)} />
      <button onClick={() => actions.clearResults()}>Clear</button>
      {/* actions.getHistory doesn't exist - no @daemon */}
    </>
  );
}
```

## Service Must Be Registered

Service must be registered via `useDI()` in a parent component:

```tsx
// Parent component
function ProductPage() {
  const di = useDI();
  const service = di.createService(ProductService);
  di.registerService(service); // Register here
  
  return <ProductList />; // Child can consume
}

// Child component
function ProductList() {
  // Works because parent registered ProductService
  const { service, actions } = useServiceConsumer(ProductService);
}
```

## Complete Pattern

```tsx
// Page component - creates and initializes service
function ProductPage({ categoryId }) {
  const di = useDI();
  
  const service = di.createService(ProductService);
  di.registerService(service);
  
  const { operationId } = useService(service, [categoryId]);
  
  return (
    <Suspense fallback={<Spinner />}>
      <Operation operationId={operationId}>
        {() => <ProductContent />}
      </Operation>
    </Suspense>
  );
}

// Content component - consumes service
function ProductContent() {
  const { service, actions } = useServiceConsumer(ProductService);
  
  const products = useOperation({
    operationId: getId(service.fetchProducts),
    suspense: true,
  });
  
  return (
    <div>
      <button onClick={() => actions.fetchProducts()}>
        Refresh
      </button>
      <ProductList items={products.result} />
    </div>
  );
}
```

## See Also

- [useDI](./use-di) - Register services
- [useService](./use-service) - Initialize service
- [@daemon](../decorators/daemon) - Create actions

