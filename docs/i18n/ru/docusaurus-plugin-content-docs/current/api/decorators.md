# API Декораторов

## @operation

Сохраняет результат метода в Redux store как AsyncOperation.

### Сигнатуры

```typescript
// Базовое использование — автоматический ID
@operation
*method() { return value; }

// Пользовательский ID
@operation(operationId: OperationId<TRes, TArgs>)
*method(...args: TArgs) { return value; }

// Динамический ID на основе аргументов
@operation((arg1, arg2) => `${arg1}_${arg2}` as OperationId<TRes>)
*method(arg1: string, arg2: string) { return value; }

// Полные опции
@operation({
  id?: OperationId | ((...args) => OperationId),
  updateStrategy?: (operation: AsyncOperation) => AsyncOperation,
  ssr?: boolean,
})
*method() { return value; }
```

### Опции

| Опция | Тип | Описание |
|-------|-----|----------|
| `id` | `OperationId \| Function` | Пользовательский или динамический ID операции |
| `updateStrategy` | `Generator` | Пользовательская логика обновления состояния |
| `ssr` | `boolean` | Включить выполнение на сервере |

### Примеры

```typescript
class DataService extends Service {
  toString() { return 'DataService'; }

  // Автоматический ID: "DATA_SERVICE_FETCH_ITEMS"
  @operation
  *fetchItems() {
    return yield* call(api.getItems);
  }

  // Пользовательский статический ID
  @operation('GLOBAL_USER_DATA' as OperationId<User>)
  *fetchUser() {
    return yield* call(api.getUser);
  }

  // Динамический ID для каждого аргумента
  @operation((id) => `ITEM_${id}` as OperationId<Item, [string]>)
  *fetchItem(id: string) {
    return yield* call(api.getItem, id);
  }

  // Со стратегией обновления (например, для пагинации)
  @operation({
    updateStrategy: function* (next) {
      const prev = yield* select(s => s.asyncOperations.get(next.id));
      return {
        ...next,
        result: prev?.result 
          ? [...prev.result, ...next.result] 
          : next.result,
      };
    },
  })
  *loadMore(page: number) {
    return yield* call(api.getPage, page);
  }

  // С включённым SSR
  @operation({ ssr: true })
  *fetchInitialData() {
    return yield* call(api.getInitialData);
  }
}
```

### Получение ID операции

```typescript
import { getId } from '@iiiristram/sagun';

const operationId = getId(service.fetchItems);
```

## @daemon

Делает метод вызываемым через Redux action.

### Сигнатуры

```typescript
// Режим по умолчанию (Sync)
@daemon()
*method() { }

// Конкретный режим
@daemon(mode: DaemonMode)
*method() { }

// Режим с пользовательским паттерном action
@daemon(mode: DaemonMode, action: Pattern<any>)
*method() { }
```

### DaemonMode

```typescript
enum DaemonMode {
  Sync = 'SYNC',       // Ждать завершения предыдущего
  Every = 'EVERY',     // Выполнять все параллельно (takeEvery)
  Last = 'LAST',       // Отменить предыдущий (takeLatest)
  Schedule = 'SCHEDULE' // Периодическое выполнение
}
```

### Примеры

```typescript
class FormService extends Service {
  toString() { return 'FormService'; }

  // Режим Sync — ждать завершения предыдущего
  @daemon()
  *submitForm(data: FormData) {
    return yield* call(api.submit, data);
  }

  // Режим Last — отменить предыдущий поиск
  @daemon(DaemonMode.Last)
  *search(query: string) {
    yield* delay(300); // Debounce
    return yield* call(api.search, query);
  }

  // Режим Every — отправить и забыть
  @daemon(DaemonMode.Every)
  *trackAnalytics(event: string) {
    yield* call(analytics.track, event);
  }

  // Режим Schedule — polling
  @daemon(DaemonMode.Schedule, 10000) // Каждые 10 секунд
  *pollNotifications() {
    return yield* call(api.getNotifications);
  }

  // Пользовательский паттерн action
  @daemon(DaemonMode.Every, 'EXTERNAL_ACTION')
  *handleExternalAction(payload: any) {
    yield* call(this.processPayload, payload);
  }
}
```

### Вызов daemon методов

```tsx
function Component() {
  const { actions } = useServiceConsumer(FormService);
  
  return (
    <button onClick={() => actions.submitForm(formData)}>
      Отправить
    </button>
  );
}
```

## @inject

Помечает параметр конструктора для dependency injection.

### Сигнатура

```typescript
@inject(key: Ctr<Dependency> | DependencyKey<T>)
```

### Примеры

```typescript
// Инъекция по классу
class OrderService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(UserService) private userService: UserService,
    @inject(CartService) private cartService: CartService,
  ) {
    super(os);
  }
}

// Инъекция по ключу
const API_CONFIG = 'API_CONFIG' as DependencyKey<ApiConfig>;

class ApiService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(API_CONFIG) private config: ApiConfig,
  ) {
    super(os);
  }
}

// Регистрация
const di = useDI();
di.registerDependency(API_CONFIG, { baseUrl: '/api' });
const apiService = di.createService(ApiService);
```

