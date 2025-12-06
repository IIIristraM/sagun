# Services API

## Dependency

Base class for all injectable dependencies.

```typescript
class Dependency {
  toString(): string; // Must return unique identifier
}
```

## BaseService

Base class with daemon support and lifecycle management.

```typescript
class BaseService<TRunArgs extends any[] = [], TRes = void> extends Dependency {
  *run(...args: TRunArgs): Generator<any, TRes | undefined>;
  *destroy(...args: TRunArgs): Generator<any, void>;
  getStatus(): 'unavailable' | 'ready';
  getUUID(): string;
}
```

### Methods

| Method | Description |
|--------|-------------|
| `run(...args)` | Initialize service, start daemons, set status to `ready` |
| `destroy(...args)` | Cleanup service, stop daemons, set status to `unavailable` |
| `getStatus()` | Get current service status |
| `getUUID()` | Get unique instance identifier |

## Service

Main class for user services with OperationService integration.

```typescript
class Service<TRunArgs extends any[] = [], TRes = void> 
  extends BaseService<TRunArgs, TRes> {
  
  protected _operationsService: OperationService;
  
  constructor(@inject(OperationService) operationService: OperationService);
}
```

### Example

```typescript
class MyService extends Service<[string], Data> {
  toString() { return 'MyService'; }
  
  *run(id: string) {
    yield* call([this, super.run]);
    return yield* call(this.fetchData, id);
  }
  
  @operation
  *fetchData(id: string) {
    return yield* call(api.fetch, id);
  }
}
```

## OperationService

Core service managing operation lifecycle.

```typescript
class OperationService extends BaseService {
  constructor(options?: { hash?: SagaClientHash });
  
  createOperation(options: {
    operationArgs: Parameters<typeof createOperation>;
    ssr?: boolean;
  }): Operation;
  
  subscribeOperation(operationId: string): Promise<unknown>;
  getHash(): SagaClientHash | undefined;
}
```

### Constructor Options

| Option | Type | Description |
|--------|------|-------------|
| `hash` | `SagaClientHash` | SSR context hash for hydration |

### Methods

| Method | Description |
|--------|-------------|
| `createOperation(options)` | Create and register an operation |
| `subscribeOperation(id)` | Subscribe to operation completion (returns Promise) |
| `getHash()` | Get SSR hash for serialization |
| `registerConsumer(consumer, operationId)` | Register operation consumer |
| `unregisterConsumer(consumer, operationId?)` | Unregister consumer |

## ComponentLifecycleService

Manages component saga lifecycle (useSaga/useService).

```typescript
class ComponentLifecycleService extends Service {
  scheduleExecution<TArgs>(options: LoadOptions<TArgs, any>): void;
  getCurrentExecution(operationId: string): LoadOptions | undefined;
}
```

### Methods

| Method | Description |
|--------|-------------|
| `load(operationId)` | Start load cycle (daemon) |
| `cleanup({ operationId })` | Cleanup on unmount (daemon) |
| `scheduleExecution(options)` | Schedule next execution |
| `getCurrentExecution(id)` | Get current execution state |

## UUIDGenerator

Utility service for generating unique IDs.

```typescript
class UUIDGenerator extends Dependency {
  toString(): 'UUIDGenerator';
  uuid(prefix?: string): string;
}
```

