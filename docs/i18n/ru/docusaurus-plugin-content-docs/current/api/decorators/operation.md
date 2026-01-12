# @operation

Превращает метод сервиса в отслеживаемую операцию.

## Описание

Декоратор `@operation`:

1. **Создаёт AsyncOperation** — состояние операции хранится в Redux
2. **Отслеживает выполнение** — автоматически обновляет `loading`, `success`, `error`
3. **Генерирует уникальный ID** — идентификатор формируется из сервиса, метода и аргументов

## Базовый пример

```typescript
import { Service, operation } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

class UserService extends Service {
  toString() {
    return 'UserService';
  }

  @operation
  *fetchUser(id: string) {
    const user = yield* call(api.getUser, id);
    return user;
  }
}
```

## Получение результата

```tsx
import { useOperation, Operation } from '@iiiristram/sagun';

function UserProfile({ userId }) {
  const service = useDI().getService(UserService);
  
  // Получить ID операции
  const operationId = getId(service.fetchUser, userId);
  
  // Через хук
  const operation = useOperation(operationId);
  
  // Или через компонент
  return (
    <Operation operationId={operationId}>
      {(op) => <div>{op.result?.name}</div>}
    </Operation>
  );
}
```

## См. также

- [@daemon](./daemon) — режимы выполнения
- [useOperation](../hooks/use-operation) — подписка на операцию
- [Operation](../components/operation) — компонент отображения

