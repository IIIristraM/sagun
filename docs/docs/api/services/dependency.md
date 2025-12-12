# Dependency

Base class for all injectable dependencies.

## Definition

```typescript
class Dependency {
  toString(): string; // Must return unique identifier
}
```

## Description

`Dependency` is the base class that enables dependency injection in Sagun. Any class that extends `Dependency` can be:

- Registered in the DI container
- Injected into other services via `@inject` decorator
- Retrieved using `useDI().getService()`

## Requirements

Classes extending `Dependency` **must** override the `toString()` method to return a unique identifier:

```typescript
class MyDependency extends Dependency {
  toString() {
    return 'MyDependency'; // Unique identifier
  }
}
```

## Example

```typescript
import { Dependency } from '@iiiristram/sagun';

class Logger extends Dependency {
  toString() {
    return 'Logger';
  }

  log(message: string) {
    console.log(`[LOG]: ${message}`);
  }

  error(message: string) {
    console.error(`[ERROR]: ${message}`);
  }
}

// Registration
const di = useDI();
const logger = new Logger();
di.registerService(logger);

// Usage in another service
class UserService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(Logger) private logger: Logger,
  ) {
    super(os);
  }

  *fetchUser(id: string) {
    this.logger.log(`Fetching user ${id}`);
    // ...
  }
}
```

## See Also

- [BaseService](./base-service) - Service with lifecycle management
- [Service](./service) - Main service class
- [@inject](../decorators/inject) - Injection decorator

