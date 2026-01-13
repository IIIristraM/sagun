# Server-Side Rendering (SSR)

Sagun supports server-side rendering with data fetching and hydration.

## Overview

SSR in Sagun works by:

1. Marking operations with `ssr: true`
2. Rendering on server, collecting operation results
3. Serializing state and SSR hash to client
4. Hydrating on client, skipping already-fetched operations

## Setup

### Mark SSR Operations

```typescript
class ProductService extends Service {
  toString() { return 'ProductService'; }

  @operation({ ssr: true }) // Enable SSR
  *fetchProducts() {
    return yield* call(api.getProducts);
  }

  @operation // Client-only
  *trackView(productId: string) {
    yield* call(analytics.track, 'view', productId);
  }
}
```

### Subscribe in Component

```tsx
function ProductPage() {
  const { service } = useServiceConsumer(ProductService);
  
  const { operationId } = useSaga({
    id: 'products',
    onLoad: service.fetchProducts,
  });

  return (
    <Suspense fallback={<Spinner />}>
      <Operation operationId={operationId}>
        {({ result }) => <ProductList products={result} />}
      </Operation>
    </Suspense>
  );
}
```

## React 18+ Implementation

### Server

```tsx
// server.ts
import { createDeferred, Root, OperationService, ComponentLifecycleService, useOperation } from '@iiiristram/sagun';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'stream';
import { Provider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';
import { applyMiddleware, createStore } from 'redux';
import { call } from 'typed-redux-saga';

async function render(req, res) {
  const sagaMiddleware = createSagaMiddleware();
  const store = applyMiddleware(sagaMiddleware)(createStore)(asyncOperationsReducer);

  // Important: Initialize hash as empty object for SSR
  const operationService = new OperationService({ hash: {} });
  const componentLifecycleService = new ComponentLifecycleService(operationService);

  const task = sagaMiddleware.run(function* () {
    yield* call(operationService.run);
    yield* call(componentLifecycleService.run);
  });

  useOperation.setPath(state => state);

  let html = '';
  const defer = createDeferred();

  const stream = renderToPipeableStream(
    <Root 
      operationService={operationService} 
      componentLifecycleService={componentLifecycleService}
    >
      <Provider store={store}>
        <App />
      </Provider>
    </Root>,
    {
      onAllReady() {
        const s = new PassThrough();
        stream.pipe(s);

        s.on('data', chunk => {
          html += chunk;
        });

        s.on('end', () => {
          defer.resolve();
        });
      },
      onError(err) {
        console.error(err);
        defer.reject(err);
      },
    }
  );

  await defer.promise;

  // Cleanup sagas
  task.cancel();
  await task.toPromise();

  // Send response with state and hash
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>App</title>
      </head>
      <body>
        <script>
          window.__STATE_FROM_SERVER__ = ${JSON.stringify(store.getState())};
          window.__SSR_CONTEXT__ = ${JSON.stringify(operationService.getHash())};
        </script>
        <div id="app">${html}</div>
        <script src="/bundle.js"></script>
      </body>
    </html>
  `);
}
```

### Client

```tsx
// client.ts
import { Root, OperationService, ComponentLifecycleService, useOperation, asyncOperationsReducer } from '@iiiristram/sagun';
import { hydrateRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';
import { applyMiddleware, createStore } from 'redux';
import { call } from 'typed-redux-saga';

const sagaMiddleware = createSagaMiddleware();

// Initialize store with server state
const store = applyMiddleware(sagaMiddleware)(createStore)(
  asyncOperationsReducer,
  window.__STATE_FROM_SERVER__
);

// Pass SSR hash - operations with same args will be skipped
const operationService = new OperationService({ 
  hash: window.__SSR_CONTEXT__ 
});
const componentLifecycleService = new ComponentLifecycleService(operationService);

sagaMiddleware.run(function* () {
  yield* call(operationService.run);
  yield* call(componentLifecycleService.run);
});

useOperation.setPath(state => state);

hydrateRoot(
  document.getElementById('app'),
  <Root 
    operationService={operationService} 
    componentLifecycleService={componentLifecycleService}
  >
    <Provider store={store}>
      <App />
    </Provider>
  </Root>
);
```

## React 17 and Below

For React 17, use `renderToStringAsync` from Sagun:

```tsx
// server.ts
import { renderToStringAsync } from '@iiiristram/sagun/server';

async function render(req, res) {
  // ... setup same as above ...

  // Use renderToStringAsync instead of renderToPipeableStream
  const html = await renderToStringAsync(
    <Root 
      operationService={operationService} 
      componentLifecycleService={componentLifecycleService}
    >
      <Provider store={store}>
        <App />
      </Provider>
    </Root>
  );

  // ... send response same as above ...
}
```

## Disabling SSR for Subtrees

Use `DisableSsrContext` to prevent SSR for specific components:

```tsx
import { DisableSsrContext } from '@iiiristram/sagun';

function App() {
  return (
    <div>
      {/* SSR enabled */}
      <Header />
      <ProductList />
      
      {/* SSR disabled for this subtree */}
      <DisableSsrContext.Provider value={true}>
        <InteractiveChat />
        <LiveNotifications />
      </DisableSsrContext.Provider>
    </div>
  );
}
```

## SSR Best Practices

### 1. Only Mark Data-Fetching Operations

```typescript
class ProductService extends Service {
  // ✅ Data fetching - enable SSR
  @operation({ ssr: true })
  *fetchProducts() {
    return yield* call(api.getProducts);
  }

  // ❌ User interaction - keep client-only
  @operation
  *addToCart(productId: string) {
    return yield* call(api.addToCart, productId);
  }
}
```

### 2. Handle SSR-Specific Logic

```typescript
@operation({ ssr: true })
*fetchInitialData() {
  // Different behavior on server vs client
  if (isNodeEnv()) {
    // Server: fetch from internal service
    return yield* call(internalApi.getData);
  } else {
    // Client: fetch from public API
    return yield* call(publicApi.getData);
  }
}
```

### 3. Avoid Side Effects in SSR Operations

```typescript
// ❌ Bad - side effects in SSR operation
@operation({ ssr: true })
*fetchUser() {
  const user = yield* call(api.getUser);
  yield* call(analytics.track, 'user_loaded'); // Side effect!
  return user;
}

// ✅ Good - separate concerns
@operation({ ssr: true })
*fetchUser() {
  return yield* call(api.getUser);
}

@operation // Client-only
*trackUserLoaded() {
  yield* call(analytics.track, 'user_loaded');
}
```

### 4. Test SSR Separately

```typescript
describe('ProductService SSR', () => {
  it('should fetch products on server', async () => {
    const operationService = new OperationService({ hash: {} });
    
    // ... render on "server" ...
    
    const hash = operationService.getHash();
    expect(hash['PRODUCT_SERVICE_FETCH_PRODUCTS']).toBeDefined();
  });
  
  it('should skip fetch on client with hash', async () => {
    const hash = { 
      'PRODUCT_SERVICE_FETCH_PRODUCTS': { 
        args: [], 
        result: mockProducts 
      } 
    };
    const operationService = new OperationService({ hash });
    
    // ... hydrate on "client" ...
    
    // API should not be called
    expect(api.getProducts).not.toHaveBeenCalled();
  });
});
```

