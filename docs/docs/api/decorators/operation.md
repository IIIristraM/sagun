# @operation

Saves method result to Redux store as an AsyncOperation.

## Signatures

```typescript
// Basic usage - auto-generated ID
@operation
*method() { return value; }

// Custom ID
@operation(operationId: OperationId<TRes, TArgs>)
*method(...args: TArgs) { return value; }

// Dynamic ID based on arguments
@operation((arg1, arg2) => `${arg1}_${arg2}` as OperationId<TRes>)
*method(arg1: string, arg2: string) { return value; }

// Full options
@operation({
  id?: OperationId | ((...args) => OperationId),
  updateStrategy?: (operation: AsyncOperation) => AsyncOperation,
  ssr?: boolean,
})
*method() { return value; }
```

## Options

| Option | Type | Description |
|--------|------|-------------|
| `id` | `OperationId \| Function` | Custom or dynamic operation ID |
| `updateStrategy` | `Generator` | Custom update logic for operation state |
| `ssr` | `boolean` | Enable server-side execution |

## Basic Usage

```typescript
class DataService extends Service {
  toString() { return 'DataService'; }

  // Auto-generated ID: "DATA_SERVICE_FETCH_ITEMS"
  @operation
  *fetchItems() {
    return yield* call(api.getItems);
  }
}
```

## Custom ID

```typescript
const USER_DATA_ID = 'GLOBAL_USER_DATA' as OperationId<User>;

class UserService extends Service {
  toString() { return 'UserService'; }

  @operation(USER_DATA_ID)
  *fetchUser() {
    return yield* call(api.getUser);
  }
}
```

## Dynamic ID

Useful when you need separate operations per argument:

```typescript
class ItemService extends Service {
  toString() { return 'ItemService'; }

  @operation((id) => `ITEM_${id}` as OperationId<Item, [string]>)
  *fetchItem(id: string) {
    return yield* call(api.getItem, id);
  }
}

// Each call creates a separate operation:
// fetchItem('1') → operation ID: "ITEM_1"
// fetchItem('2') → operation ID: "ITEM_2"
```

## Update Strategy

Customize how operation state updates (e.g., for pagination):

```typescript
class ListService extends Service {
  toString() { return 'ListService'; }

  @operation({
    updateStrategy: function* (next) {
      const prev = yield* select(s => s.asyncOperations.get(next.id));
      return {
        ...next,
        result: prev?.result && next.result 
          ? [...prev.result, ...next.result] 
          : next.result,
      };
    },
  })
  *loadMore(page: number) {
    return yield* call(api.getPage, page);
  }
}
```

## SSR Enabled

Mark operations that should execute on the server:

```typescript
class ProductService extends Service {
  toString() { return 'ProductService'; }

  @operation({ ssr: true })
  *fetchProducts() {
    return yield* call(api.getProducts);
  }
}
```

## Getting Operation ID

```typescript
import { getId } from '@iiiristram/sagun';

const operationId = getId(service.fetchItems);
```

## See Also

- [@daemon](./daemon) - Make method callable via action
- [useOperation](../hooks/use-operation) - Subscribe to operation
- [Operation component](../components/operation) - Render operation state

