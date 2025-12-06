# Операции

Операции — это основная структура данных в Sagun. Они представляют состояние асинхронных действий в вашем приложении.

## Тип AsyncOperation

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

## OperationId

`OperationId` — это брендированный строковый тип, который несёт информацию о типах операции:

```typescript
// Создаём типизированный ID операции
const FETCH_USER = 'FETCH_USER' as OperationId<User, [string], never, Error>;

// Информация о типах сохраняется
type Result = OperationFromId<typeof FETCH_USER>; 
// = AsyncOperation<User, [string], never, Error>
```

## Создание операций

Операции автоматически создаются при использовании декоратора `@operation`:

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

## Чтение операций

Используйте хук `useOperation` для подписки на состояние операции:

```tsx
function UserProfile() {
  const { service } = useServiceConsumer(UserService);
  
  const operation = useOperation({
    operationId: getId(service.fetchUser),
    suspense: false, // Не бросать Promise для Suspense
    defaultState: { isLoading: true },
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

## Жизненный цикл операции

1. **Создана** — операция добавлена в store с `isLoading: true`
2. **Выполняется** — сага выполняется
3. **Завершена** — `isLoading: false`, установлен `result`
4. **Ошибка** — `isLoading: false`, `isError: true`, установлен `error`
5. **Уничтожена** — операция удалена, когда не осталось потребителей

