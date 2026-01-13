# Memory Management

Sagun automatically manages memory by cleaning up operations and services when they are no longer needed. Understanding this mechanism helps optimize application performance.

## How It Works

### Operation Consumer Counting

Each operation in Sagun tracks its **consumers**. A consumer is:
- A component that called `useOperation` with this operation
- A service whose method created the operation via `@operation`

When the last consumer unsubscribes from an operation, it is automatically destroyed and removed from the Redux store.

```
┌─────────────────────────────────────────────────────────────┐
│                      Redux Store                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ asyncOperations                                     │    │
│  │   ├── "UserService/fetchUser" (consumers: 2)        │    │
│  │   ├── "OrderService/getOrders" (consumers: 1)       │    │
│  │   └── "fetch-products" (consumers: 0) ← removed     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Service Lifecycle

Services have an explicit lifecycle managed through `run()` and `destroy()`:

1. **Creation** — service is created via `di.createService()`
2. **Initialization** — `useService` calls `run()`, operations are subscribed
3. **Operation** — service handles requests
4. **Cleanup** — on unmount `useService` calls `destroy()`, unsubscribing from operations

```tsx
function ProductPage() {
  const di = useDI();
  const service = di.createService(ProductService);
  di.registerService(service);
  
  // On mount: service.run()
  // On unmount: service.destroy()
  const { operationId } = useService(service);
  
  return (...);
}
```

## Optimization Best Practices

### Register Services Close to Usage

The closer a service is registered to the components that use it, the more efficient memory cleanup becomes.

```tsx
// ❌ Bad: page service registered at app root
function App() {
  const di = useDI();
  const productService = di.createService(ProductService);
  di.registerService(productService);
  
  return <Router>...</Router>;
}

// ✅ Good: page service registered at page level
function ProductPage() {
  const di = useDI();
  const productService = di.createService(ProductService);
  di.registerService(productService);
  
  return <ProductList />;
}
```

With the second approach:
- Service is created only when user visits the page
- When leaving the page, service is destroyed along with all operations
- Memory is freed automatically

### Use One useSaga Per Component

Each `useSaga` call creates a separate operation. Combine related loads into one saga:

```tsx
// ❌ Bad: three separate operations
function Dashboard() {
  useSaga({ id: 'user', onLoad: fetchUser });
  useSaga({ id: 'orders', onLoad: fetchOrders });
  useSaga({ id: 'stats', onLoad: fetchStats });
  
  return (...);
}

// ✅ Good: one operation with parallel loading
function Dashboard() {
  useSaga({ 
    id: 'dashboard-data',
    onLoad: function* () {
      yield* all([
        call(fetchUser),
        call(fetchOrders),
        call(fetchStats)
      ]);
    }
  });
  
  return (...);
}
```

### Cleanup in onDispose

If a saga performs side effects (subscriptions, timers), clean them up in `onDispose`:

```tsx
useSaga({
  id: 'websocket',
  onLoad: function* () {
    const socket = yield* call(connectWebSocket);
    // Save reference for cleanup
    return socket;
  },
  onDispose: function* () {
    // Called on unmount or when args change
    yield* call(disconnectWebSocket);
  }
});
```

## See Also

- [Services](./services) — service lifecycle
- [Operations](./operations) — how operations work
- [useService](../api/hooks/use-service) — automatic lifecycle management
- [useSaga](../api/hooks/use-saga) — data loading with cleanup
