# ComponentLifecycleService

Manages component saga lifecycle for `useSaga` and `useService` hooks.

## Definition

```typescript
class ComponentLifecycleService extends Service {
  scheduleExecution<TArgs>(options: LoadOptions<TArgs, any>): void;
  getCurrentExecution(operationId: string): LoadOptions | undefined;
}
```

## Methods

| Method | Description |
|--------|-------------|
| `load(operationId)` | Start load cycle (internal daemon) |
| `cleanup({ operationId })` | Cleanup on unmount (internal daemon) |
| `scheduleExecution(options)` | Schedule next execution |
| `getCurrentExecution(id)` | Get current execution state |

## Description

`ComponentLifecycleService` handles the lifecycle of sagas bound to React components. It:

- Manages `onLoad`/`onDispose` cycle for `useSaga`
- Handles cancellation when arguments change
- Ensures `onDispose` completes before next `onLoad`
- Coordinates with `OperationService` for cleanup

## Setup

```typescript
import { OperationService, ComponentLifecycleService, Root } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

const operationService = new OperationService();
const componentLifecycleService = new ComponentLifecycleService(operationService);

sagaMiddleware.run(function* () {
  yield* call(operationService.run);
  yield* call(componentLifecycleService.run);
});

// Provide to app
<Root 
  operationService={operationService}
  componentLifecycleService={componentLifecycleService}
>
  <App />
</Root>
```

## Lifecycle Flow

When `useSaga` is called:

1. `scheduleExecution()` is called with saga config
2. `load()` daemon picks up the execution
3. `onLoad` saga runs
4. If args change or component unmounts:
   - Current `onLoad` is cancelled
   - `onDispose` runs to completion
   - New `onLoad` runs (if args changed)
5. On unmount, `cleanup()` removes the operation

## Internal Usage

This service is used internally by:

- `useSaga` hook
- `useService` hook

You typically don't interact with it directly.

## See Also

- [OperationService](./operation-service) - Operation management
- [useSaga](../hooks/use-saga) - Saga hook
- [useService](../hooks/use-service) - Service hook

