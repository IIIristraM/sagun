# Sagun

Strongly-typed service-based isomorphic architecture on top of redux-saga.

[![npm version](https://img.shields.io/npm/v/@iiiristram/sagun.svg)](https://www.npmjs.com/package/@iiiristram/sagun)

## Features

- **Decoupled Business Logic** — Keep business logic separate from React components
- **Reduced Redux Boilerplate** — Single reducer for all operations, auto-generated actions
- **SSR Compatible** — Server-side rendering support without duplicating logic (React 16-19)
- **Dependency Injection** — Built-in DI container with TypeScript decorators
- **Fully Typed** — Strong typing for operations, services, and hooks
- **Suspense Ready** — Native React Suspense integration

## Installation

```bash
# Peer dependencies
npm install react react-dom redux react-redux redux-saga immutable

# Library
npm install @iiiristram/sagun

# Recommended for typed saga effects
npm install typed-redux-saga
```

## TypeScript Configuration

Enable decorators in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

## Quick Start

```tsx
import { applyMiddleware, createStore, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';
import { call } from 'typed-redux-saga';
import {
  ComponentLifecycleService,
  OperationService,
  asyncOperationsReducer,
  Root,
  useOperation,
} from '@iiiristram/sagun';

const sagaMiddleware = createSagaMiddleware();
const store = applyMiddleware(sagaMiddleware)(createStore)(
  combineReducers({ asyncOperations: asyncOperationsReducer })
);

useOperation.setPath(state => state.asyncOperations);

const operationService = new OperationService();
const componentLifecycleService = new ComponentLifecycleService(operationService);

sagaMiddleware.run(function* () {
  yield* call(operationService.run);
  yield* call(componentLifecycleService.run);
});

ReactDOM.render(
  <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
    <Provider store={store}>
      <App />
    </Provider>
  </Root>,
  document.getElementById('app')
);
```

## Documentation

Full documentation is available at **[iiiristram.github.io/sagun](https://iiiristram.github.io/sagun/)**

- [Getting Started](https://iiiristram.github.io/sagun/docs/getting-started)
- [Tutorial](https://iiiristram.github.io/sagun/docs/tutorial/data-load)
- [Core Concepts](https://iiiristram.github.io/sagun/docs/concepts/operations)
- [API Reference](https://iiiristram.github.io/sagun/docs/api/hooks/use-saga)

## License

MIT
