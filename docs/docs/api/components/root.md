# Root

Root component that provides all necessary contexts for Sagun.

## Props

```typescript
interface RootProps {
  operationService: OperationService;
  componentLifecycleService: ComponentLifecycleService;
  children: React.ReactNode;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `operationService` | `OperationService` | Core operation management service |
| `componentLifecycleService` | `ComponentLifecycleService` | Component saga lifecycle service |
| `children` | `ReactNode` | Application content |

## What Root Provides

- `DIContext` - Dependency injection container
- Automatically registers:
  - `UUIDGenerator`
  - `OperationService`
  - `ComponentLifecycleService`

## Basic Setup

```tsx
import { 
  Root, 
  OperationService, 
  ComponentLifecycleService,
  asyncOperationsReducer,
  useOperation,
} from '@iiiristram/sagun';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore, combineReducers } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { call } from 'typed-redux-saga';

// 1. Create saga middleware
const sagaMiddleware = createSagaMiddleware();

// 2. Create store
const store = applyMiddleware(sagaMiddleware)(createStore)(
  combineReducers({
    asyncOperations: asyncOperationsReducer,
  })
);

// 3. Configure useOperation
useOperation.setPath(state => state.asyncOperations);

// 4. Create services
const operationService = new OperationService();
const componentLifecycleService = new ComponentLifecycleService(operationService);

// 5. Run services
sagaMiddleware.run(function* () {
  yield* call(operationService.run);
  yield* call(componentLifecycleService.run);
});

// 6. Render app
function App() {
  return (
    <Root 
      operationService={operationService} 
      componentLifecycleService={componentLifecycleService}
    >
      <Provider store={store}>
        <AppContent />
      </Provider>
    </Root>
  );
}
```

## SSR Setup

```tsx
// Server
const operationService = new OperationService({ hash: {} });
const componentLifecycleService = new ComponentLifecycleService(operationService);

// ... render ...

const ssrHash = operationService.getHash();
// Send to client

// Client
const operationService = new OperationService({ 
  hash: window.__SSR_CONTEXT__ 
});
const componentLifecycleService = new ComponentLifecycleService(operationService);
```

## Placement

`Root` should be:
- Outside `Provider` (so DI context is available everywhere)
- At the top of your component tree

```tsx
// ✅ Correct
<Root ...>
  <Provider store={store}>
    <App />
  </Provider>
</Root>

// ❌ Wrong - Provider outside Root
<Provider store={store}>
  <Root ...>
    <App />
  </Root>
</Provider>
```

## See Also

- [OperationService](../services/operation-service)
- [ComponentLifecycleService](../services/component-lifecycle-service)
- [Getting Started](../../getting-started)

