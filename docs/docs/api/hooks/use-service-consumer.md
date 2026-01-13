# useServiceConsumer

Gets a service and creates actions for its `@daemon` methods.

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
| `ServiceClass` | `Class` | Service class (not instance!) |

## Returns

| Field | Type | Description |
|-------|------|-------------|
| `service` | `T` | Service instance from DI container |
| `actions` | `ActionAPI<T>` | Object with actions for `@daemon` methods, bound to store |

## Description

`useServiceConsumer` solves two tasks:

1. **Gets service** — equivalent to `useDI().getService(ServiceClass)`
2. **Creates actions** — for all methods with `@daemon` decorator, bound to Redux store

## Basic Usage

```tsx
import { useServiceConsumer } from '@iiiristram/sagun';

function SearchForm() {
  // Get service and actions by class
  const { service, actions } = useServiceConsumer(SearchService);
  
  return (
    <input 
      onChange={(e) => actions.search(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

## With useOperation

```tsx
import { useServiceConsumer, useOperation, getId } from '@iiiristram/sagun';

function UserProfile() {
  const { service, actions } = useServiceConsumer(UserService);
  
  // Get operation ID of @operation method
  const operationId = getId(service.fetchUser);
  const operation = useOperation({ operationId });
  
  return (
    <div>
      {operation.isLoading ? (
        <Spinner />
      ) : (
        <div>
          <h1>{operation.result?.name}</h1>
          <button onClick={() => actions.fetchUser()}>
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
```

## Actions Are Typed

Actions are automatically typed based on service methods:

```typescript
class UserService extends Service {
  toString() { return 'UserService'; }

  @daemon()
  *updateName(userId: string, newName: string) {
    yield* call(api.updateName, userId, newName);
  }
}

// In component
const { actions } = useServiceConsumer(UserService);

// TypeScript knows the signature:
actions.updateName('123', 'New name'); // ✓ OK
actions.updateName('123');              // ✗ Error: missing argument
actions.updateName(123, 'Name');        // ✗ Error: wrong type
```

## When to Use

| Situation | Hook |
|-----------|------|
| Initialize service (owner) | `useService` |
| Use service (consumer) | `useServiceConsumer` |
| Run simple saga | `useSaga` |

```tsx
// Owner component — creates and initializes
function ProductPage() {
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

// Consumer component — uses the ready service
function ProductList() {
  const { service, actions } = useServiceConsumer(ProductService);
  const operationId = getId(service.getProducts);
  const operation = useOperation({ operationId });
  
  return (
    <ul>
      {operation.result?.map(product => (
        <li key={product.id}>
          {product.name}
          <button onClick={() => actions.addToCart(product.id)}>
            Add to cart
          </button>
        </li>
      ))}
    </ul>
  );
}
```

## See Also

- [useService](./use-service) — service initialization
- [useOperation](./use-operation) — subscribing to operation
- [@daemon](../decorators/daemon) — decorator for creating actions
- [useDI](./use-di) — working with DI container
