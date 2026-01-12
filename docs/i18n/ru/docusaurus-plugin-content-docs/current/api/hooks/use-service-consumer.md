# useServiceConsumer

Получает сервис и создаёт actions для его `@daemon` методов.

## Сигнатура

```typescript
function useServiceConsumer<T extends BaseService>(
  ServiceClass: new (...args: any[]) => T
): {
  service: T;
  actions: ActionAPI<T>;
};
```

## Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `ServiceClass` | `Class` | Класс сервиса (не экземпляр!) |

## Возвращаемое значение

| Поле | Тип | Описание |
|------|-----|----------|
| `service` | `T` | Экземпляр сервиса из DI контейнера |
| `actions` | `ActionAPI<T>` | Объект с actions для `@daemon` методов, привязанных к store |

## Описание

`useServiceConsumer` решает две задачи:

1. **Получает сервис** — эквивалент `useDI().getService(ServiceClass)`
2. **Создаёт actions** — для всех методов с `@daemon` декоратором, привязанные к Redux store

## Базовый пример

```tsx
import { useServiceConsumer } from '@iiiristram/sagun';

function SearchForm() {
  // Получаем сервис и actions по классу
  const { service, actions } = useServiceConsumer(SearchService);
  
  return (
    <input 
      onChange={(e) => actions.search(e.target.value)}
      placeholder="Поиск..."
    />
  );
}
```

## Использование с useOperation

```tsx
import { useServiceConsumer, useOperation, getId } from '@iiiristram/sagun';

function UserProfile() {
  const { service, actions } = useServiceConsumer(UserService);
  
  // Получить ID операции @operation метода
  const operationId = getId(service.fetchUser);
  const operation = useOperation({ operationId });
  
  return (
    <div>
      {operation.isLoading ? (
        <Spinner />
      ) : (
        <div>
          <h1>{operation.result?.name}</h1>
          <button onClick={() => actions.fetchUser()}>
            Обновить
          </button>
        </div>
      )}
    </div>
  );
}
```

## Actions типизированы

Actions автоматически типизируются на основе методов сервиса:

```typescript
class UserService extends Service {
  toString() { return 'UserService'; }

  @daemon()
  *updateName(userId: string, newName: string) {
    yield* call(api.updateName, userId, newName);
  }
}

// В компоненте
const { actions } = useServiceConsumer(UserService);

// TypeScript знает сигнатуру:
actions.updateName('123', 'Новое имя'); // ✓ OK
actions.updateName('123');               // ✗ Ошибка: не хватает аргумента
actions.updateName(123, 'Имя');          // ✗ Ошибка: неверный тип
```

## Когда использовать

| Ситуация | Хук |
|----------|-----|
| Инициализировать сервис (владелец) | `useService` |
| Использовать сервис (потребитель) | `useServiceConsumer` |
| Запустить простую сагу | `useSaga` |

```tsx
// Компонент-владелец — создаёт и инициализирует
function ProductPage() {
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

// Компонент-потребитель — использует готовый
function ProductList() {
  const { service, actions } = useServiceConsumer(ProductService);
  const operationId = getId(service.getProducts);
  const operation = useOperation({ operationId });
  
  return (
    <ul>
      {operation.result?.map(product => (
        <li key={product.id}>
          {product.name}
          <button onClick={() => actions.addToCart(product.id)}>
            В корзину
          </button>
        </li>
      ))}
    </ul>
  );
}
```

## См. также

- [useService](./use-service) — инициализация сервиса
- [useOperation](./use-operation) — подписка на операцию
- [@daemon](../decorators/daemon) — декоратор для создания actions
- [useDI](./use-di) — работа с DI контейнером
