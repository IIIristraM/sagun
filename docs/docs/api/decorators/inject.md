# @inject

Injects a dependency into a service constructor.

## Signature

```typescript
// Inject class (Dependency or Service)
function inject<T extends Dependency>(
  ServiceClass: new (...args: any[]) => T
): ParameterDecorator;

// Inject by key (arbitrary data)
function inject<T>(
  key: DependencyKey<T>
): ParameterDecorator;
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `InjectionKey` | Dependency class or `DependencyKey<T>` |

```typescript
type InjectionKey = Ctr<any> | DependencyKey<any>;
```

## Description

The `@inject` decorator:

1. **Marks parameter** — tells the DI container which dependency to inject
2. **Two key types** — `Dependency` class or string constant `DependencyKey<T>`
3. **Auto-resolves** — when creating via `di.createService()` dependencies are substituted
4. **Type-safe** — TypeScript checks type correspondence

## Basic Usage

```typescript
import { Service, inject, OperationService } from '@iiiristram/sagun';

class UserService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
  ) {
    super(os);
  }
}
```

## With Multiple Dependencies

```typescript
import { Service, inject, OperationService, Dependency } from '@iiiristram/sagun';

class Logger extends Dependency {
  toString() { return 'Logger'; }
  log(msg: string) { console.log(msg); }
}

class ApiClient extends Dependency {
  toString() { return 'ApiClient'; }
  fetch(url: string) { return fetch(url); }
}

class DataService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(Logger) private logger: Logger,
    @inject(ApiClient) private api: ApiClient,
  ) {
    super(os);
  }

  @operation
  *fetchData() {
    this.logger.log('Loading data...');
    return yield* call([this.api, this.api.fetch], '/data');
  }
}
```

## Registration and Creation

```typescript
import { useDI } from '@iiiristram/sagun';

function App() {
  const di = useDI();
  
  // Register dependencies
  di.registerService(new Logger());
  di.registerService(new ApiClient());
  
  // Create service — dependencies are injected automatically
  const dataService = di.createService(DataService);
  di.registerService(dataService);
}
```

## Parameter Order

`OperationService` must be the first parameter for classes extending `Service`:

```typescript
class MyService extends Service {
  constructor(
    @inject(OperationService) os: OperationService, // First
    @inject(Logger) private logger: Logger,          // Others
    @inject(ApiClient) private api: ApiClient,
  ) {
    super(os); // Pass to super
  }
}
```

## Injection via DependencyKey

To inject arbitrary data (not classes), use `DependencyKey<T>`:

```typescript
import { DependencyKey } from '@iiiristram/sagun';

// Define type and key
export type AppConfig = {
  apiUrl: string;
  debug: boolean;
};

export const CONFIG_KEY = 'APP_CONFIG' as DependencyKey<AppConfig>;
```

Register data by key:

```typescript
function App() {
  const di = useDI();
  
  // Register data by key
  const config: AppConfig = {
    apiUrl: 'https://api.example.com',
    debug: true,
  };
  di.registerDependency(CONFIG_KEY, config);
  
  // Now services can inject config
  const service = di.createService(MyService);
}
```

Use in service:

```typescript
import { Service, inject, OperationService } from '@iiiristram/sagun';
import { CONFIG_KEY, AppConfig } from './config';

class MyService extends Service {
  private config: AppConfig;

  constructor(
    @inject(OperationService) os: OperationService,
    @inject(CONFIG_KEY) config: AppConfig,
  ) {
    super(os);
    this.config = config;
  }

  *fetchData() {
    const url = `${this.config.apiUrl}/data`;
    return yield* call(fetch, url);
  }
}
```

## Combining Dependency Types

```typescript
class ComplexService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    // Inject service (class)
    @inject(AuthService) private auth: AuthService,
    // Inject Dependency (class)
    @inject(Logger) private logger: Logger,
    // Inject data (key)
    @inject(CONFIG_KEY) private config: AppConfig,
  ) {
    super(os);
  }
}
```

## See Also

- [Dependency](../services/dependency) — base dependency class
- [Service](../services/service) — service class
- [useDI](../hooks/use-di) — access to DI container
