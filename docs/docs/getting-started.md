# Getting Started

This guide will help you set up Sagun in your React application.

## Installation

First, install the peer dependencies:

```bash
npm install react react-dom redux react-redux redux-saga immutable
```

Then install Sagun:

```bash
npm install @iiiristram/sagun
```

We also recommend installing `typed-redux-saga` for strongly-typed saga effects:

```bash
npm install typed-redux-saga
```

## TypeScript Configuration

Sagun uses TypeScript decorators. Enable them in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

## Bootstrap Your Application

Below is an example of typical application initialization based on redux and redux-saga, with highlighted lines that need to be added to configure the framework:

```tsx
// bootstrap.tsx
import { applyMiddleware, createStore, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';
import React from 'react';
import ReactDOM from 'react-dom';
// highlight-start
import { call } from 'typed-redux-saga';
import {
  ComponentLifecycleService,
  OperationService,
  asyncOperationsReducer,
  Root,
  useOperation,
} from '@iiiristram/sagun';
// highlight-end

import { App } from './App';

// 1. Create saga middleware
const sagaMiddleware = createSagaMiddleware();

// 2. Create Redux store with operations reducer
const store = applyMiddleware(sagaMiddleware)(createStore)(
  combineReducers({
    // highlight-next-line
    asyncOperations: asyncOperationsReducer,
  })
);

// 3. Configure the path to operations in state
// highlight-next-line
useOperation.setPath(state => state.asyncOperations);

// 4. Create the core services
// highlight-start
const operationService = new OperationService();
const componentLifecycleService = new ComponentLifecycleService(operationService);
// highlight-end

// 5. Run the saga middleware with core services
sagaMiddleware.run(function* () {
  // highlight-start
  yield* call(operationService.run);
  yield* call(componentLifecycleService.run);
  // highlight-end
});

// 6. Render the application
ReactDOM.render(
  // highlight-start
  <Root 
    operationService={operationService} 
    componentLifecycleService={componentLifecycleService}
  >
  // highlight-end
    <Provider store={store}>
      <App />
    </Provider>
  // highlight-next-line 
  </Root>,
  document.getElementById('app')
);
```

## Create Your First Service

Services contain your business logic. Here's a simple example:

```tsx
// services/TodoService.ts
import { Service, operation, daemon, DaemonMode } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export class TodoService extends Service {
  // Required: unique identifier for the service
  toString() {
    return 'TodoService';
  }

  // @operation saves result to Redux store
  // @daemon makes method callable via Redux action
  @operation
  @daemon()
  *fetchTodos() {
    const response: Response = yield* call(fetch, '/api/todos');
    const todos: Todo[] = yield* call([response, response.json]);
    return todos;
  }

  @daemon(DaemonMode.Last) // Cancel previous call if new one starts
  *addTodo(title: string) {
    const response: Response = yield* call(fetch, '/api/todos', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    return yield* call([response, response.json]);
  }
}
```

## Use Service in Component

```tsx
// components/TodoList.tsx
import React, { Suspense } from 'react';
import { 
  useDI, 
  useService, 
  useServiceConsumer, 
  useOperation, 
  Operation,
  getId 
} from '@iiiristram/sagun';
import { TodoService } from '../services/TodoService';

// Page component - initializes the service
export function TodoPage() {
  const di = useDI();
  
  // Create and register service instance
  const service = di.createService(TodoService);
  di.registerService(service);
  
  // Initialize service (calls service.run())
  const { operationId } = useService(service);
  
  return (
    <Suspense fallback={<div>Loading service...</div>}>
      <Operation operationId={operationId}>
        {() => <TodoList />}
      </Operation>
    </Suspense>
  );
}

// Child component - consumes the service
function TodoList() {
  const { service, actions } = useServiceConsumer(TodoService);
  
  // Subscribe to operation result
  const operation = useOperation({
    operationId: getId(service.fetchTodos),
    suspense: true,
  });
  
  const todos = operation?.result || [];
  
  return (
    <div>
      <button onClick={() => actions.fetchTodos()}>
        Refresh
      </button>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Next Steps

Now that you have Sagun set up, learn more about:

- [Operations](./concepts/operations.md) - Understanding the core data structure
- [Services](./concepts/services.md) - Deep dive into service patterns
- [Dependency Injection](./advanced/dependency-injection.md) - Managing service dependencies

