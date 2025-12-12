# @operation

Превращает метод сервиса в отслеживаемую операцию.

## Сигнатура

```typescript
function operation(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor;
```

## Описание

Декоратор `@operation`:

1. **Создаёт AsyncOperation** — состояние операции хранится в Redux
2. **Отслеживает выполнение** — автоматически обновляет `loading`, `success`, `error`
3. **Генерирует уникальный ID** — идентификатор формируется из сервиса, метода и аргументов
4. **Интегрируется с `@daemon`** — обеспечивает корректную отмену и перезапуск

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

## С декоратором @daemon

```typescript
import { Service, operation, daemon, DaemonMode } from '@iiiristram/sagun';

class DataService extends Service {
  toString() {
    return 'DataService';
  }

  // Перезапускается при каждом вызове, предыдущий отменяется
  @operation
  @daemon()
  *fetchData(query: string) {
    return yield* call(api.search, query);
  }

  // Выполняется только первый вызов, остальные игнорируются
  @operation
  @daemon(DaemonMode.Leading)
  *initData() {
    return yield* call(api.init);
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

## Формирование ID операции

ID операции формируется как:

```
{serviceId}_{methodName}_{hash(args)}
```

Это позволяет:
- Кэшировать результаты для тех же аргументов
- Отменять устаревшие операции
- Переиспользовать операции между компонентами

## См. также

- [@daemon](./daemon) — режимы выполнения
- [useOperation](../hooks/use-operation) — подписка на операцию
- [Operation](../components/operation) — компонент отображения

