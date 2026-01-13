# @operation

Сохраняет результат метода в Redux store как AsyncOperation.

## Сигнатуры

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

## Опции

| Опция | Тип | Описание |
|-------|-----|----------|
| `id` | `OperationId \| Function` | Пользовательский или динамический ID операции |
| `updateStrategy` | `Generator` | Пользовательская логика обновления состояния операции |
| `ssr` | `boolean` | Включить выполнение на сервере |

## Описание

Декоратор `@operation`:

1. **Создаёт AsyncOperation** — состояние операции хранится в Redux
2. **Отслеживает выполнение** — автоматически обновляет `isLoading`, `isError`, `result`
3. **Генерирует уникальный ID** — идентификатор формируется из имени сервиса и метода

## Базовый пример

```typescript
import { Service, operation } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

class DataService extends Service {
  toString() { return 'DataService'; }

  // Автоматический ID: "DATA_SERVICE_FETCH_ITEMS"
  @operation
  *fetchItems() {
    return yield* call(api.getItems);
  }
}
```

## Пользовательский ID

```typescript
const USER_DATA_ID = 'GLOBAL_USER_DATA' as OperationId<User>;

class UserService extends Service {
  toString() { return 'UserService'; }

  @operation(USER_DATA_ID)
  *fetchUser() {
    return yield* call(api.getUser);
  }
}
```

## Динамический ID

Полезно, когда нужны отдельные операции для разных аргументов:

```typescript
class ItemService extends Service {
  toString() { return 'ItemService'; }

  @operation((id) => `ITEM_${id}` as OperationId<Item, [string]>)
  *fetchItem(id: string) {
    return yield* call(api.getItem, id);
  }
}

// Каждый вызов создаёт отдельную операцию:
// fetchItem('1') → operation ID: "ITEM_1"
// fetchItem('2') → operation ID: "ITEM_2"
```

## Стратегия обновления

Настройте способ обновления состояния операции (например, для пагинации):

```typescript
class ListService extends Service {
  toString() { return 'ListService'; }

  @operation({
    updateStrategy: function* (next) {
      const prev = yield* select(s => s.asyncOperations.get(next.id));
      return {
        ...next,
        result: prev?.result && next.result 
          ? [...prev.result, ...next.result] 
          : next.result,
      };
    },
  })
  *loadMore(page: number) {
    return yield* call(api.getPage, page);
  }
}
```

## SSR

Отметьте операции, которые должны выполняться на сервере:

```typescript
class ProductService extends Service {
  toString() { return 'ProductService'; }

  @operation({ ssr: true })
  *fetchProducts() {
    return yield* call(api.getProducts);
  }
}
```

## Получение результата

```tsx
import { useOperation, Operation, getId } from '@iiiristram/sagun';

function UserProfile({ userId }) {
  const service = useDI().getService(UserService);
  
  // Получить ID операции
  const operationId = getId(service.fetchUser, userId);
  
  // Через хук
  const operation = useOperation({ operationId });
  
  // Или через компонент
  return (
    <Operation operationId={operationId}>
      {(op) => <div>{op.result?.name}</div>}
    </Operation>
  );
}
```

## Получение Operation ID

```typescript
import { getId } from '@iiiristram/sagun';

const operationId = getId(service.fetchItems);
```

## См. также

- [@daemon](./daemon) — режимы выполнения методов
- [useOperation](../hooks/use-operation) — подписка на операцию
- [Operation](../components/operation) — компонент отображения
