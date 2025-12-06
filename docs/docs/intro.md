# Introduction

**Sagun** is a strongly-typed service-based isomorphic architecture built on top of [redux-saga](https://redux-saga.js.org/).

## Core Principles

1. **Keep business logic decoupled from components** - Your React components stay clean and focused on UI
2. **Split your business logic into small services** - Better organization and testability
3. **Reduce Redux boilerplate** - Single reducer for all operations, auto-generated actions
4. **SSR compatible** - Server-side rendering without duplicating logic
5. **Dependency Injection** - Built-in DI container with TypeScript decorators
6. **Fully typed** - Written entirely in TypeScript with strong typing

## Requirements

- React 16+ (supports 16, 17, 18, 19)
- Redux & React-Redux
- Redux-Saga
- Immutable.js ^4.0.0
- TypeScript with `experimentalDecorators: true`

## Installation

```bash
# Peer dependencies
npm install react react-dom redux react-redux redux-saga immutable

# Library
npm install @iiiristram/sagun

# Recommended
npm install typed-redux-saga
```

## Quick Example

```tsx
import { Service, operation, daemon, useService, Operation } from '@iiiristram/sagun';
import { call, delay } from 'typed-redux-saga';

// Define a service
class UserService extends Service {
  toString() { return 'UserService'; }

  @operation
  @daemon()
  *fetchUser(id: string) {
    yield* delay(1000);
    return { id, name: 'John Doe' };
  }
}

// Use in component
function UserPage({ userId }) {
  const di = useDI();
  const service = di.createService(UserService);
  di.registerService(service);
  
  const { operationId } = useService(service);
  
  return (
    <Suspense fallback="Loading...">
      <Operation operationId={operationId}>
        {() => <UserProfile />}
      </Operation>
    </Suspense>
  );
}
```

## Next Steps

- [Getting Started](./getting-started) - Set up Sagun in your project
- [Core Concepts](./concepts/operations) - Learn about Operations and Services
- [API Reference](./api/services) - Detailed API documentation

