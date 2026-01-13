# Root

Провайдер для настройки Sagun в приложении.

## Сигнатура

```tsx
function Root(props: {
  children: ReactNode;
  operationService: OperationService;
  componentLifecycleService: ComponentLifecycleService;
}): JSX.Element;
```

## Props

| Prop | Тип | Описание |
|------|-----|----------|
| `children` | `ReactNode` | Дочерние компоненты |
| `operationService` | `OperationService` | Сервис управления операциями |
| `componentLifecycleService` | `ComponentLifecycleService` | Сервис жизненного цикла компонентов |

## Описание

`Root` — это провайдер, который:

1. **Создаёт DI контейнер** — доступен через `useDI()`
2. **Регистрирует системные сервисы** — `OperationService`, `ComponentLifecycleService`, `UUIDGenerator`
3. **Предоставляет контексты** — для работы хуков

## Базовый пример

```tsx
import { 
  Root, 
  OperationService, 
  ComponentLifecycleService,
  asyncOperationsReducer 
} from '@iiiristram/sagun';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { call } from 'typed-redux-saga';

// Настройка Redux
const sagaMiddleware = createSagaMiddleware();
const store = createStore(
  combineReducers({
    asyncOperations: asyncOperationsReducer,
  }),
  applyMiddleware(sagaMiddleware)
);

// Создание сервисов
const operationService = new OperationService();
const componentLifecycleService = new ComponentLifecycleService(operationService);

// Запуск сервисов
sagaMiddleware.run(function* () {
  yield* call(operationService.run);
  yield* call(componentLifecycleService.run);
});

// Приложение
function App() {
  return (
    <Provider store={store}>
      <Root 
        operationService={operationService}
        componentLifecycleService={componentLifecycleService}
      >
        <MyApp />
      </Root>
    </Provider>
  );
}
```

## С SSR

```tsx
// Сервер
const hash = {};
const operationService = new OperationService({ hash });

// После рендеринга — сериализовать данные
const ssrContext = operationService.getHash();

// Клиент
const operationService = new OperationService({ hash: window.__SSR_CONTEXT__ });
```

## См. также

- [Service](../services/service) — базовый класс сервиса
- [useDI](../hooks/use-di) — доступ к контейнеру
- [Начало работы](../../getting-started) — полное руководство по настройке

