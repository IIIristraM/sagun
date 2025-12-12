# useOperation

Подписывается на состояние операции.

## Сигнатура

```typescript
function useOperation<TResult>(
  operationId: string
): AsyncOperation<TResult>;
```

## Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `operationId` | `string` | ID операции для подписки |

## Возвращаемое значение

Объект `AsyncOperation`:

| Поле | Тип | Описание |
|------|-----|----------|
| `loading` | `boolean` | Операция выполняется |
| `success` | `boolean` | Операция завершилась успешно |
| `error` | `Error \| null` | Ошибка, если произошла |
| `result` | `TResult \| null` | Результат операции |

## Описание

`useOperation` подписывается на операцию в Redux store и возвращает её текущее состояние. Компонент перерендерится при изменении состояния.

## Базовый пример

```tsx
import { useSaga, useOperation } from '@iiiristram/sagun';

function UserProfile({ userId }) {
  const { operationId } = useSaga({
    onLoad: function* () {
      return yield* call(api.getUser, userId);
    }
  }, [userId]);

  const operation = useOperation(operationId);

  if (operation.loading) {
    return <Spinner />;
  }

  if (operation.error) {
    return <ErrorMessage error={operation.error} />;
  }

  return <div>Привет, {operation.result?.name}!</div>;
}
```

## С операцией сервиса

```tsx
import { useOperation, getId } from '@iiiristram/sagun';

function UserActions({ userId }) {
  const di = useDI();
  const userService = di.getService(UserService);
  
  // Получить ID операции по методу и аргументам
  const operationId = getId(userService.fetchUser, userId);
  const operation = useOperation(operationId);

  if (operation.loading) {
    return <Button disabled>Загрузка...</Button>;
  }

  return <Button onClick={() => userService.fetchUser(userId)}>
    Обновить
  </Button>;
}
```

## Vs Operation компонент

`useOperation` и `Operation` решают одну задачу разными способами:

```tsx
// useOperation — ручное управление
function WithHook({ operationId }) {
  const op = useOperation(operationId);
  
  if (op.loading) return <Spinner />;
  if (op.error) return <Error error={op.error} />;
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
- Нужен доступ к `loading`/`error` в логике компонента
- Не используете Suspense
- Нужно обрабатывать состояния особым образом

Используйте `Operation` когда:
- Используете Suspense
- Достаточно просто отобразить результат

## См. также

- [Operation](../components/operation) — компонент отображения
- [useSaga](./use-saga) — запуск саги
- [AsyncOperation](../../concepts/operations) — структура операции

