# useOperation

Подписывается на состояние операции.

## Сигнатура

```typescript
function useOperation<TRes, TArgs = any, TMeta = never, TErr = Error>(
  options: {
    operationId: OperationId<TRes, TArgs, TMeta, TErr>;
    defaultState?: Partial<AsyncOperation<TRes, TArgs, TMeta, TErr>>;
    suspense?: boolean;
  }
): Partial<AsyncOperation<TRes, TArgs, TMeta, TErr>>;

// Статический метод — обязательно вызвать перед использованием
useOperation.setPath(path: (state: any) => State): void;
```

## Параметры

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `options.operationId` | `OperationId` | — | ID операции для подписки |
| `options.defaultState` | `Partial<AsyncOperation>` | `{ isLoading: true }` | Состояние по умолчанию, если операции нет в store |
| `options.suspense` | `boolean` | `false` | Интеграция с React Suspense |

## Возвращаемое значение

Объект `AsyncOperation`:

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `OperationId` | ID операции |
| `isLoading` | `boolean?` | Операция выполняется |
| `isError` | `boolean?` | Операция завершилась с ошибкой |
| `isBlocked` | `boolean?` | Операция заблокирована |
| `error` | `TErr?` | Ошибка, если произошла |
| `result` | `TRes?` | Результат операции |
| `args` | `TArgs?` | Аргументы, с которыми запущена операция |
| `meta` | `TMeta?` | Дополнительные метаданные |

## Описание

`useOperation` подписывается на операцию в Redux store и возвращает её текущее состояние. Компонент перерендерится при изменении состояния.

:::warning Настройка пути
Перед использованием необходимо указать путь к операциям в store:

```typescript
// bootstrap.ts
useOperation.setPath(state => state.asyncOperations);
```
:::

## Базовый пример

```tsx
import { useSaga, useOperation } from '@iiiristram/sagun';

function UserProfile({ userId }) {
  const { operationId } = useSaga({
    id: `user-${userId}`,
    onLoad: function* () {
      return yield* call(api.getUser, userId);
    }
  }, [userId]);

  const operation = useOperation({ operationId });

  if (operation.isLoading) {
    return <Spinner />;
  }

  if (operation.isError) {
    return <ErrorMessage error={operation.error} />;
  }

  return <div>Привет, {operation.result?.name}!</div>;
}
```

## С операцией сервиса

```tsx
import { useOperation, useServiceConsumer, getId } from '@iiiristram/sagun';

function UserActions() {
  const { service, actions } = useServiceConsumer(UserService);
  
  // Получить ID операции по методу
  const operationId = getId(service.fetchUser);
  const operation = useOperation({ operationId });

  if (operation.isLoading) {
    return <Button disabled>Загрузка...</Button>;
  }

  return (
    <Button onClick={() => actions.fetchUser()}>
      Обновить
    </Button>
  );
}
```

## С Suspense

```tsx
function UserData({ userId }) {
  const { operationId } = useSaga({
    id: `user-data-${userId}`,
    onLoad: function* () {
      return yield* call(api.getUser, userId);
    }
  }, [userId]);

  // suspense: true — компонент "подвиснет" пока isLoading
  const operation = useOperation({ operationId, suspense: true });

  // Сюда попадаем только когда данные готовы
  return <div>{operation.result?.name}</div>;
}

function Parent() {
  return (
    <Suspense fallback={<Spinner />}>
      <UserData userId="123" />
    </Suspense>
  );
}
```

## С defaultState

```tsx
function OptionalData({ operationId }) {
  const operation = useOperation({
    operationId,
    // Состояние по умолчанию, если операции нет в store
    defaultState: { 
      isLoading: false, 
      result: [] 
    }
  });

  return <List items={operation.result ?? []} />;
}
```

## Vs Operation компонент

`useOperation` и `Operation` решают одну задачу разными способами:

```tsx
// useOperation — ручное управление
function WithHook({ operationId }) {
  const op = useOperation({ operationId });
  
  if (op.isLoading) return <Spinner />;
  if (op.isError) return <Error error={op.error} />;
  return <Data result={op.result} />;
}

// useOperation с Suspense
function WithHookSuspense({ operationId }) {
  const op = useOperation({ operationId, suspense: true });
  return <Data result={op.result} />;
}

// Operation — декларативный подход с Suspense
function WithComponent({ operationId }) {
  return (
    <Suspense fallback={<Spinner />}>
      <Operation operationId={operationId}>
        {(op) => <Data result={op.result} />}
      </Operation>
    </Suspense>
  );
}
```

Используйте `useOperation` когда:
- Нужен доступ к `isLoading`/`isError` в логике компонента
- Нужно кастомное `defaultState`
- Нужно обрабатывать состояния особым образом

Используйте `Operation` когда:
- Используете Suspense
- Достаточно просто отобразить результат

## См. также

- [Operation](../components/operation) — компонент отображения
- [useSaga](./use-saga) — запуск саги
- [AsyncOperation](../../concepts/operations) — структура операции

