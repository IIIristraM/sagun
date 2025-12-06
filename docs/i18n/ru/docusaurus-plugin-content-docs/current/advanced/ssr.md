# Server-Side Rendering (SSR)

Sagun поддерживает серверный рендеринг с загрузкой данных и гидрацией.

## Обзор

SSR в Sagun работает следующим образом:

1. Помечаем операции флагом `ssr: true`
2. Рендерим на сервере, собираем результаты операций
3. Сериализуем состояние и SSR хэш для клиента
4. Гидратируем на клиенте, пропуская уже загруженные операции

## Настройка

### Помечаем SSR операции

```typescript
class ProductService extends Service {
  toString() { return 'ProductService'; }

  @operation({ ssr: true }) // Включаем SSR
  *fetchProducts() {
    return yield* call(api.getProducts);
  }

  @operation // Только клиент
  *trackView(productId: string) {
    yield* call(analytics.track, 'view', productId);
  }
}
```

### Подписка в компоненте

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

## Реализация для React 18+

### Сервер

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

  // Важно: инициализируем hash как пустой объект для SSR
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

  // Очистка саг
  task.cancel();
  await task.toPromise();

  // Отправляем ответ с состоянием и хэшем
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

### Клиент

```tsx
// client.ts
import { Root, OperationService, ComponentLifecycleService, useOperation, asyncOperationsReducer } from '@iiiristram/sagun';
import { hydrateRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';
import { applyMiddleware, createStore } from 'redux';
import { call } from 'typed-redux-saga';

const sagaMiddleware = createSagaMiddleware();

// Инициализируем store с серверным состоянием
const store = applyMiddleware(sagaMiddleware)(createStore)(
  asyncOperationsReducer,
  window.__STATE_FROM_SERVER__
);

// Передаём SSR хэш — операции с теми же аргументами будут пропущены
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

## React 17 и ниже

Для React 17 используйте `renderToStringAsync` из Sagun:

```tsx
// server.ts
import { renderToStringAsync } from '@iiiristram/sagun/server';

async function render(req, res) {
  // ... настройка такая же ...

  // Используйте renderToStringAsync вместо renderToPipeableStream
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

  // ... отправка ответа такая же ...
}
```

## Отключение SSR для поддеревьев

Используйте `DisableSsrContext` для предотвращения SSR для определённых компонентов:

```tsx
import { DisableSsrContext } from '@iiiristram/sagun';

function App() {
  return (
    <div>
      {/* SSR включён */}
      <Header />
      <ProductList />
      
      {/* SSR отключён для этого поддерева */}
      <DisableSsrContext.Provider value={true}>
        <InteractiveChat />
        <LiveNotifications />
      </DisableSsrContext.Provider>
    </div>
  );
}
```

## Лучшие практики SSR

### 1. Помечайте только операции загрузки данных

```typescript
class ProductService extends Service {
  // ✅ Загрузка данных — включаем SSR
  @operation({ ssr: true })
  *fetchProducts() {
    return yield* call(api.getProducts);
  }

  // ❌ Взаимодействие с пользователем — оставляем только для клиента
  @operation
  *addToCart(productId: string) {
    return yield* call(api.addToCart, productId);
  }
}
```

### 2. Обрабатывайте SSR-специфичную логику

```typescript
@operation({ ssr: true })
*fetchInitialData() {
  // Разное поведение на сервере и клиенте
  if (isNodeEnv()) {
    // Сервер: запрос к внутреннему сервису
    return yield* call(internalApi.getData);
  } else {
    // Клиент: запрос к публичному API
    return yield* call(publicApi.getData);
  }
}
```

### 3. Избегайте побочных эффектов в SSR операциях

```typescript
// ❌ Плохо — побочные эффекты в SSR операции
@operation({ ssr: true })
*fetchUser() {
  const user = yield* call(api.getUser);
  yield* call(analytics.track, 'user_loaded'); // Побочный эффект!
  return user;
}

// ✅ Хорошо — разделение ответственности
@operation({ ssr: true })
*fetchUser() {
  return yield* call(api.getUser);
}

@operation // Только клиент
*trackUserLoaded() {
  yield* call(analytics.track, 'user_loaded');
}
```

### 4. Тестируйте SSR отдельно

```typescript
describe('ProductService SSR', () => {
  it('должен загружать продукты на сервере', async () => {
    const operationService = new OperationService({ hash: {} });
    
    // ... рендерим на "сервере" ...
    
    const hash = operationService.getHash();
    expect(hash['PRODUCT_SERVICE_FETCH_PRODUCTS']).toBeDefined();
  });
  
  it('должен пропускать загрузку на клиенте с хэшем', async () => {
    const hash = { 
      'PRODUCT_SERVICE_FETCH_PRODUCTS': { 
        args: [], 
        result: mockProducts 
      } 
    };
    const operationService = new OperationService({ hash });
    
    // ... гидратируем на "клиенте" ...
    
    // API не должен быть вызван
    expect(api.getProducts).not.toHaveBeenCalled();
  });
});
```

