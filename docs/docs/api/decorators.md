# Decorators API

## @operation

Saves method result to Redux store as an AsyncOperation.

### Signatures

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

### Options

| Option | Type | Description |
|--------|------|-------------|
| `id` | `OperationId \| Function` | Custom or dynamic operation ID |
| `updateStrategy` | `Generator` | Custom update logic for operation state |
| `ssr` | `boolean` | Enable server-side execution |

### Examples

```typescript
class DataService extends Service {
  toString() { return 'DataService'; }

  // Auto-generated ID: "DATA_SERVICE_FETCH_ITEMS"
  @operation
  *fetchItems() {
    return yield* call(api.getItems);
  }

  // Custom static ID
  @operation('GLOBAL_USER_DATA' as OperationId<User>)
  *fetchUser() {
    return yield* call(api.getUser);
  }

  // Dynamic ID per argument
  @operation((id) => `ITEM_${id}` as OperationId<Item, [string]>)
  *fetchItem(id: string) {
    return yield* call(api.getItem, id);
  }

  // With update strategy (e.g., for pagination)
  @operation({
    updateStrategy: function* (next) {
      const prev = yield* select(s => s.asyncOperations.get(next.id));
      return {
        ...next,
        result: prev?.result 
          ? [...prev.result, ...next.result] 
          : next.result,
      };
    },
  })
  *loadMore(page: number) {
    return yield* call(api.getPage, page);
  }

  // SSR enabled
  @operation({ ssr: true })
  *fetchInitialData() {
    return yield* call(api.getInitialData);
  }
}
```

### Getting Operation ID

```typescript
import { getId } from '@iiiristram/sagun';

const operationId = getId(service.fetchItems);
```

## @daemon

Makes method callable via Redux action.

### Signatures

```typescript
// Default mode (Sync)
@daemon()
*method() { }

// Specific mode
@daemon(mode: DaemonMode)
*method() { }

// Mode with custom action pattern
@daemon(mode: DaemonMode, action: Pattern<any>)
*method() { }
```

### DaemonMode

```typescript
enum DaemonMode {
  Sync = 'SYNC',       // Block until previous completes
  Every = 'EVERY',     // Run all in parallel (takeEvery)
  Last = 'LAST',       // Cancel previous (takeLatest)
  Schedule = 'SCHEDULE' // Run periodically
}
```

### Examples

```typescript
class FormService extends Service {
  toString() { return 'FormService'; }

  // Sync mode - wait for previous to complete
  @daemon()
  *submitForm(data: FormData) {
    return yield* call(api.submit, data);
  }

  // Last mode - cancel previous search
  @daemon(DaemonMode.Last)
  *search(query: string) {
    yield* delay(300); // Debounce
    return yield* call(api.search, query);
  }

  // Every mode - fire and forget
  @daemon(DaemonMode.Every)
  *trackAnalytics(event: string) {
    yield* call(analytics.track, event);
  }

  // Schedule mode - polling
  @daemon(DaemonMode.Schedule, 10000) // Every 10 seconds
  *pollNotifications() {
    return yield* call(api.getNotifications);
  }

  // Custom action pattern
  @daemon(DaemonMode.Every, 'EXTERNAL_ACTION')
  *handleExternalAction(payload: any) {
    yield* call(this.processPayload, payload);
  }
}
```

### Calling Daemon Methods

```tsx
function Component() {
  const { actions } = useServiceConsumer(FormService);
  
  return (
    <button onClick={() => actions.submitForm(formData)}>
      Submit
    </button>
  );
}
```

## @inject

Marks constructor parameter for dependency injection.

### Signature

```typescript
@inject(key: Ctr<Dependency> | DependencyKey<T>)
```

### Examples

```typescript
// Inject by class
class OrderService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(UserService) private userService: UserService,
    @inject(CartService) private cartService: CartService,
  ) {
    super(os);
  }
}

// Inject by key
const API_CONFIG = 'API_CONFIG' as DependencyKey<ApiConfig>;

class ApiService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(API_CONFIG) private config: ApiConfig,
  ) {
    super(os);
  }
}

// Registration
const di = useDI();
di.registerDependency(API_CONFIG, { baseUrl: '/api' });
const apiService = di.createService(ApiService);
```

