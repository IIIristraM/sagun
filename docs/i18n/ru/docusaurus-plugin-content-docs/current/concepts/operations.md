# Операции

Операции — это основная структура данных в Sagun. Они представляют состояние асинхронных действий в вашем приложении.
Store в приложении — это словарь, где можно получить операцию по ключу.

Такой подход позволяет унифицировать работу с состоянием приложения.

## Типы

Операции описываются следующим контрактом

```typescript
type AsyncOperation<TRes, TArgs, TMeta, TErr> = {
  id: OperationId<TRes, TArgs, TMeta, TErr>; // Уникальный идентификатор
  isLoading?: boolean;    // Операция выполняется
  isError?: boolean;      // Операция завершилась с ошибкой
  isBlocked?: boolean;    // Операция заблокирована
  error?: TErr;           // Ошибка (если есть)
  args?: TArgs;           // Аргументы вызова операции
  result?: TRes;          // Результат операции
  meta?: TMeta;           // Дополнительные метаданные
};
```

`OperationId` — это тип описывающий ключ операции, из которого можно извлечь основную информацию о параметрах операции (тип аргументов, результата и т.д.)

```typescript
// Создаём типизированный ID операции
const FETCH_USER = 'FETCH_USER' as OperationId<User, [string], never, Error>;

// Информация о типах сохраняется
type Result = OperationFromId<typeof FETCH_USER>; 
// = AsyncOperation<User, [string], never, Error>
```

## Жизненный цикл операции

1. **Создана** — `isLoading: false`, `result: undefined`
2. **Выполняется** — `isLoading: true`, `result: undefined`
3. **Завершена** — `isLoading: false`, установлен `result`
4. **Ошибка** — `isLoading: false`, `isError: true`, установлен `error`

## Создание операций

Операции автоматически создаются при использовании декоратора `@operation` или хуков `useSaga` и `useService`:

```typescript
class UserService extends Service {
  toString() { return 'UserService'; }

  @operation // Автоматический ID: "USER_SERVICE_FETCH_USER"
  *fetchUser(id: string) {
    return yield* call(api.getUser, id);
  }

  @operation(CUSTOM_ID) // Пользовательский ID
  *fetchProfile() {
    return yield* call(api.getProfile);
  }

  @operation((id) => `USER_${id}` as OperationId<User>) // Динамический ID
  *fetchUserById(id: string) {
    return yield* call(api.getUser, id);
  }
}
```

```tsx
const {operationId} = useSaga({ id, onLoad })
```

## Чтение операций

Используйте хук `useOperation` для подписки на состояние операции:

```tsx
function UserProfile() {
  const { service } = useServiceConsumer(UserService);
  
  const operation = useOperation({
    operationId: getId(service.fetchUser),
    suspense: false, // Не бросать Promise для Suspense
    defaultState: { isLoading: true }, // fallback если операции еще не существует
  });

  if (operation.isLoading) return <Spinner />;
  if (operation.isError) return <Error error={operation.error} />;
  
  return <Profile user={operation.result} />;
}
```

## Интеграция с Suspense

Включите режим Suspense для автоматической обработки состояний загрузки:

```tsx
function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <UserProfile />
    </Suspense>
  );
}

function UserProfile() {
  const { service } = useServiceConsumer(UserService);
  
  // Бросит Promise во время загрузки (перехватывается Suspense)
  // Бросит ошибку при неудаче (перехватывается ErrorBoundary)
  const operation = useOperation({
    operationId: getId(service.fetchUser),
    suspense: true,
  });

  // Рендерится только когда операция завершена
  return <Profile user={operation.result} />;
}
```

## Стратегии обновления

Настройте способ обновления состояния операции:

```typescript
@operation({
  updateStrategy: function* mergeResults(next) {
    const prev = yield* select(state => 
      state.asyncOperations.get(next.id)
    );
    
    return {
      ...next,
      result: prev?.result && next.result 
        ? [...prev.result, ...next.result] 
        : next.result,
    };
  },
})
*loadMoreItems(page: number) {
  return yield* call(api.getItems, { page });
}
```

:::info

Стратегия применяется каждый раз перед записью состояния операции в store. При каждом вызове операции это происходит дважды — до и после выполнения её тела

:::

