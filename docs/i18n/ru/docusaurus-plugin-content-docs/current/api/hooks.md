# API Хуков

## useSaga

Привязывает выполнение саги к жизненному циклу компонента. Выполняется подобно `useMemo`.

### Сигнатура

```typescript
function useSaga<TArgs extends any[], TRes>(
  saga: {
    id: string;                        // Обязательный уникальный ID
    onLoad?: (...args: TArgs) => Generator<any, TRes>;
    onDispose?: (...args: TArgs) => Generator<any, void>;
  },
  args?: TArgs,
  options?: {
    operationOptions?: {
      updateStrategy?: IOperationUpdateStrategy<TRes, TArgs>;
    };
  }
): {
  operationId: OperationId<TRes, TArgs>;
  reload: () => void;
};
```

### Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `saga.id` | `string` | **Обязательно.** Уникальный ID для совместимости с Suspense |
| `saga.onLoad` | `Generator` | Выполняется при рендере и изменении args |
| `saga.onDispose` | `Generator` | Выполняется перед следующим onLoad и при размонтировании |
| `args` | `TArgs` | Аргументы, передаваемые в onLoad/onDispose |
| `options` | `object` | Дополнительные опции |

### Возвращает

| Свойство | Тип | Описание |
|----------|-----|----------|
| `operationId` | `OperationId` | ID для подписки на результаты |
| `reload` | `() => void` | Принудительное перевыполнение |

### Пример

```tsx
function UserProfile({ userId }) {
  const { service } = useServiceConsumer(UserService);
  
  const { operationId, reload } = useSaga({
    id: `user-profile-${userId}`,
    onLoad: function* (id) {
      yield* call(service.fetchUser, id);
      yield* call(service.fetchUserPosts, id);
    },
    onDispose: function* (id) {
      yield* call(service.clearUserCache, id);
    },
  }, [userId]);

  return (
    <Operation operationId={operationId}>
      {() => (
        <div>
          <button onClick={reload}>Обновить</button>
          <ProfileContent />
        </div>
      )}
    </Operation>
  );
}
```

### Важные замечания

- `id` **обязателен** для совместимости с React Suspense
- Если `onLoad` отменён в процессе выполнения, будет вызван `onDispose`
- `onDispose` полностью завершается до следующего `onLoad`

## useService

Сокращение для инициализации сервиса с управлением жизненным циклом.

### Сигнатура

```typescript
function useService<TArgs extends any[], TRes>(
  service: BaseService<TArgs, TRes>,
  args?: TArgs,
  options?: UseSagaOptions<TArgs, TRes>
): {
  operationId: OperationId<TRes, TArgs>;
  reload: () => void;
};
```

### Пример

```tsx
function ProductPage({ categoryId }) {
  const di = useDI();
  const service = di.createService(ProductService);
  di.registerService(service);
  
  const { operationId } = useService(service, [categoryId]);
  
  return (
    <Operation operationId={operationId}>
      {() => <ProductList />}
    </Operation>
  );
}
```

Эквивалентно:

```tsx
const { operationId } = useSaga({
  id: `init-${service.toString()}`,
  onLoad: service.run,
  onDispose: service.destroy,
}, [categoryId]);
```

## useOperation

Подписывается на состояние операции в Redux store.

### Сигнатура

```typescript
function useOperation<TRes, TArgs, TMeta, TErr>(options: {
  operationId: OperationId<TRes, TArgs, TMeta, TErr>;
  defaultState?: Partial<AsyncOperation<TRes, TArgs, TMeta, TErr>>;
  suspense?: boolean;
}): Partial<AsyncOperation<TRes, TArgs, TMeta, TErr>>;

// Статический метод для настройки пути в store
useOperation.setPath(path: (state: any) => State): void;
```

### Параметры

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `operationId` | `OperationId` | - | Операция для подписки |
| `defaultState` | `Partial<AsyncOperation>` | `{ isLoading: true }` | Состояние по умолчанию |
| `suspense` | `boolean` | `false` | Включить интеграцию с Suspense |

### Настройка

```typescript
// Должен быть вызван до использования useOperation
useOperation.setPath(state => state.asyncOperations);
```

### Примеры

```tsx
// Базовое использование
function UserCard() {
  const { service } = useServiceConsumer(UserService);
  
  const operation = useOperation({
    operationId: getId(service.fetchUser),
  });

  if (operation.isLoading) return <Spinner />;
  if (operation.isError) return <Error error={operation.error} />;
  
  return <Card user={operation.result} />;
}

// С Suspense
function UserCard() {
  const { service } = useServiceConsumer(UserService);
  
  // Бросает Promise во время загрузки (перехватывается Suspense)
  // Бросает ошибку при неудаче (перехватывается ErrorBoundary)
  const operation = useOperation({
    operationId: getId(service.fetchUser),
    suspense: true,
  });

  return <Card user={operation.result} />;
}
```

## useServiceConsumer

Получает зарегистрированный сервис и создаёт привязанные actions.

### Сигнатура

```typescript
function useServiceConsumer<T extends BaseService>(
  ServiceClass: new (...args: any[]) => T
): {
  service: T;
  actions: ActionAPI<T>;
};
```

### Возвращает

| Свойство | Тип | Описание |
|----------|-----|----------|
| `service` | `T` | Экземпляр сервиса |
| `actions` | `ActionAPI<T>` | Привязанные action creators для @daemon методов |

### Пример

```tsx
function SearchForm() {
  const { service, actions } = useServiceConsumer(SearchService);
  
  // Прямой доступ к сервису
  const searchId = getId(service.search);
  
  // Вызов daemon методов через actions
  const handleSearch = (query: string) => {
    actions.search(query); // Диспатчит Redux action
  };

  return <input onChange={(e) => handleSearch(e.target.value)} />;
}
```

## useDI

Возвращает контекст Dependency Injection.

### Сигнатура

```typescript
function useDI(): IDIContext;

interface IDIContext {
  registerDependency<D>(key: DependencyKey<D>, dependency: D): void;
  getDependency<D>(key: DependencyKey<D>): D;
  registerService(service: Dependency): void;
  createService<T extends Dependency>(Ctr: Ctr<T>): T;
  getService<T extends Dependency>(Ctr: Ctr<T>): T;
  createServiceActions<T extends BaseService>(
    service: T, 
    store?: Store
  ): ActionAPI<T>;
}
```

### Методы

| Метод | Описание |
|-------|----------|
| `registerDependency(key, value)` | Зарегистрировать зависимость по ключу |
| `getDependency(key)` | Получить зависимость по ключу |
| `registerService(service)` | Зарегистрировать экземпляр сервиса |
| `createService(Class)` | Создать сервис с разрешёнными зависимостями |
| `getService(Class)` | Получить зарегистрированный сервис по классу |
| `createServiceActions(service, store?)` | Создать action creators |

### Пример

```tsx
function App() {
  const di = useDI();
  
  // Регистрация конфига
  di.registerDependency(API_CONFIG, { baseUrl: '/api' });
  
  // Создание и регистрация сервисов
  const userService = di.createService(UserService);
  di.registerService(userService);
  
  // OrderService теперь может инъектировать UserService
  const orderService = di.createService(OrderService);
  di.registerService(orderService);
  
  return <Content />;
}
```

