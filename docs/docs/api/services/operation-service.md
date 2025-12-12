# OperationService

Core service managing operation lifecycle.

## Definition

```typescript
class OperationService extends BaseService {
  constructor(options?: { hash?: SagaClientHash });
  
  createOperation(options: {
    operationArgs: Parameters<typeof createOperation>;
    ssr?: boolean;
  }): Operation;
  
  subscribeOperation(operationId: string): Promise<unknown>;
  getHash(): SagaClientHash | undefined;
  registerConsumer(consumer: object, operationId: string): void;
  unregisterConsumer(consumer: object, operationId?: string): void;
}
```

## Constructor Options

| Option | Type | Description |
|--------|------|-------------|
| `hash` | `SagaClientHash` | SSR context hash for hydration |

## Methods

| Method | Description |
|--------|-------------|
| `createOperation(options)` | Create and register an operation |
| `subscribeOperation(id)` | Subscribe to operation completion (returns Promise) |
| `getHash()` | Get SSR hash for serialization |
| `registerConsumer(consumer, operationId)` | Register operation consumer |
| `unregisterConsumer(consumer, operationId?)` | Unregister consumer, cleanup if no consumers left |

## Description

`OperationService` is the core service that manages the lifecycle of all operations in Sagun. It:

- Creates and tracks operations
- Manages consumer subscriptions
- Handles SSR data serialization/hydration
- Cleans up operations when no consumers remain

## Basic Setup

```typescript
import { OperationService, ComponentLifecycleService } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

const operationService = new OperationService();
const componentLifecycleService = new ComponentLifecycleService(operationService);

sagaMiddleware.run(function* () {
  yield* call(operationService.run);
  yield* call(componentLifecycleService.run);
});
```

## SSR Setup

```typescript
// Server
const operationService = new OperationService({ hash: {} });

// After render
const ssrHash = operationService.getHash();
// Serialize to client: window.__SSR_CONTEXT__ = ssrHash

// Client
const operationService = new OperationService({ 
  hash: window.__SSR_CONTEXT__ 
});
// Operations with ssr: true won't re-execute if args match
```

## Operation Lifecycle

1. Operation is created via `@operation` decorator or `createOperation()`
2. Consumers register via `registerConsumer()`
3. Operation executes and updates Redux store
4. When all consumers unregister, operation is destroyed

## Internal Usage

`OperationService` is primarily used internally by:

- `@operation` decorator
- `useOperation` hook
- `ComponentLifecycleService`

You typically don't need to call its methods directly.

## See Also

- [Service](./service) - User service class
- [ComponentLifecycleService](./component-lifecycle-service) - Component lifecycle
- [@operation](../decorators/operation) - Operation decorator
- [SSR Guide](../../advanced/ssr) - Server-side rendering

