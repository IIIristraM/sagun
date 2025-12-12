# BaseService

Base class with daemon support and lifecycle management.

## Definition

```typescript
class BaseService<TRunArgs extends any[] = [], TRes = void> extends Dependency {
  *run(...args: TRunArgs): Generator<any, TRes | undefined>;
  *destroy(...args: TRunArgs): Generator<any, void>;
  getStatus(): 'unavailable' | 'ready';
  getUUID(): string;
}
```

## Type Parameters

| Parameter | Description |
|-----------|-------------|
| `TRunArgs` | Tuple type for `run()` method arguments |
| `TRes` | Return type of `run()` method |

## Methods

| Method | Description |
|--------|-------------|
| `run(...args)` | Initialize service, start daemons, set status to `ready` |
| `destroy(...args)` | Cleanup service, stop daemons, set status to `unavailable` |
| `getStatus()` | Get current service status: `'unavailable'` or `'ready'` |
| `getUUID()` | Get unique instance identifier |

## Description

`BaseService` extends [Dependency](./dependency) and adds:

- **Lifecycle management** via `run()` and `destroy()` methods
- **Daemon support** for methods decorated with `@daemon`
- **Status tracking** to know if service is ready
- **Unique instance ID** for identification

## Lifecycle

1. Service is created with status `'unavailable'`
2. `run()` is called → starts all daemons → status becomes `'ready'`
3. `destroy()` is called → stops all daemons → status becomes `'unavailable'`

## Example

```typescript
import { BaseService, daemon, DaemonMode } from '@iiiristram/sagun';
import { call, delay } from 'typed-redux-saga';

class PollingService extends BaseService {
  toString() {
    return 'PollingService';
  }

  @daemon(DaemonMode.Schedule, 5000)
  *poll() {
    console.log('Polling...');
    yield* call(api.checkUpdates);
  }
}

// Usage
const service = new PollingService();
console.log(service.getStatus()); // 'unavailable'

yield* call(service.run);
console.log(service.getStatus()); // 'ready'
// poll() is now running every 5 seconds

yield* call(service.destroy);
console.log(service.getStatus()); // 'unavailable'
// poll() is stopped
```

## Overriding Lifecycle Methods

```typescript
class MyService extends BaseService<[string], Data> {
  private data: Data | null = null;

  toString() {
    return 'MyService';
  }

  *run(id: string) {
    // IMPORTANT: Call super.run() first
    yield* call([this, super.run]);
    
    // Custom initialization
    this.data = yield* call(api.fetchData, id);
    
    return this.data;
  }

  *destroy() {
    // IMPORTANT: Call super.destroy()
    yield* call([this, super.destroy]);
    
    // Custom cleanup
    this.data = null;
  }
}
```

## See Also

- [Dependency](./dependency) - Base class
- [Service](./service) - Service with OperationService integration
- [@daemon](../decorators/daemon) - Daemon decorator

