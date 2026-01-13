# Service

Основной класс для создания пользовательских сервисов.

## Определение

```typescript
class Service<TRunArgs extends any[] = [], TRes = void> extends Dependency {
  protected _operationsService: OperationService;
  
  constructor(@inject(OperationService) operationService: OperationService);
  
  *run(...args: TRunArgs): Generator<any, TRes | undefined>;
  *destroy(...args: TRunArgs): Generator<any, void>;
  getStatus(): 'unavailable' | 'ready';
  getUUID(): string;
}
```

## Параметры типов

| Параметр | Описание |
|----------|----------|
| `TRunArgs` | Тип кортежа аргументов метода `run()` |
| `TRes` | Тип возвращаемого значения метода `run()` |

## Методы

| Метод | Описание |
|-------|----------|
| `run(...args)` | Инициализация сервиса, запуск демонов, статус становится `ready` |
| `destroy(...args)` | Очистка сервиса, остановка демонов, статус становится `unavailable` |
| `getStatus()` | Получить текущий статус: `'unavailable'` или `'ready'` |
| `getUUID()` | Получить уникальный идентификатор экземпляра |

## Описание

`Service` — это основной класс, от которого следует наследоваться при создании собственных сервисов. Он расширяет [Dependency](./dependency) и предоставляет:

- **Интеграцию с OperationService** — для работы декоратора `@operation`
- **Управление жизненным циклом** через методы `run()` и `destroy()`
- **Поддержка демонов** для методов с декоратором `@daemon`
- **Отслеживание статуса** — готов ли сервис к использованию
- **Уникальный ID экземпляра** для идентификации
- **Автоматическая очистка операций** при вызове `destroy()`

## Жизненный цикл

1. Сервис создаётся со статусом `'unavailable'`
2. Вызывается `run()` → запускаются все демоны → статус становится `'ready'`
3. Вызывается `destroy()` → останавливаются все демоны → статус становится `'unavailable'`

## Базовый пример

```typescript
import { Service, operation, daemon } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

class UserService extends Service {
  // ОБЯЗАТЕЛЬНО: уникальный идентификатор для DI и Redux actions
  toString() {
    return 'UserService';
  }

  @operation
  *fetchUser(id: string) {
    return yield* call(api.getUser, id);
  }

  @operation
  *updateUser(id: string, data: UserData) {
    return yield* call(api.updateUser, id, data);
  }
}
```

## С демонами

```typescript
import { Service, daemon, DaemonMode } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

class PollingService extends Service {
  toString() {
    return 'PollingService';
  }

  // Метод будет вызываться каждые 5 секунд после запуска сервиса
  @daemon(DaemonMode.Schedule, 5000)
  *poll() {
    console.log('Опрос...');
    yield* call(api.checkUpdates);
  }
}

// Использование
const service = new PollingService();
console.log(service.getStatus()); // 'unavailable'

yield* call(service.run);
console.log(service.getStatus()); // 'ready'
// poll() теперь выполняется каждые 5 секунд

yield* call(service.destroy);
console.log(service.getStatus()); // 'unavailable'
// poll() остановлен
```

## С пользовательской инициализацией

```typescript
class ProductService extends Service<[string], Product[]> {
  private categoryId: string = '';

  toString() {
    return 'ProductService';
  }

  *run(categoryId: string) {
    // ВАЖНО: сначала вызовите super.run()
    yield* call([this, super.run]);
    
    this.categoryId = categoryId;
    
    // Загрузка начальных данных
    return yield* call(this.fetchProducts);
  }

  *destroy() {
    // ВАЖНО: вызовите super.destroy()
    yield* call([this, super.destroy]);
    
    this.categoryId = '';
  }

  @operation
  *fetchProducts() {
    return yield* call(api.getProducts, this.categoryId);
  }
}
```

## С зависимостями

```typescript
class OrderService extends Service {
  private userService: UserService;
  private cartService: CartService;

  toString() {
    return 'OrderService';
  }

  constructor(
    @inject(OperationService) os: OperationService,
    @inject(UserService) userService: UserService,
    @inject(CartService) cartService: CartService,
  ) {
    super(os);
    this.userService = userService;
    this.cartService = cartService;
  }

  @operation
  @daemon()
  *createOrder() {
    const user = yield* call(this.userService.getCurrentUser);
    const cart = yield* call(this.cartService.getCart);
    
    return yield* call(api.createOrder, { user, cart });
  }
}
```

## Использование в компонентах

### Регистрация и инициализация

```tsx
import { useDI, useService, Operation } from '@iiiristram/sagun';

function ProductPage({ categoryId }) {
  const di = useDI();
  
  // Создание и регистрация сервиса
  const service = di.createService(ProductService);
  di.registerService(service);
  
  // Инициализация с аргументами
  const { operationId } = useService(service, [categoryId]);
  
  return (
    <Suspense fallback={<Spinner />}>
      <Operation operationId={operationId}>
        {() => <ProductList />}
      </Operation>
    </Suspense>
  );
}
```

### Доступ к сервису в дочерних компонентах

После регистрации сервиса его можно получить в любом дочернем компоненте через `useServiceConsumer`:

```tsx
import { useServiceConsumer, useSaga, useOperation, getId } from '@iiiristram/sagun';

function ProductList() {
  // Получаем сервис и actions для вызова daemon-методов
  const { service, actions } = useServiceConsumer(ProductService);
  
  // Загружаем данные при монтировании
  useSaga({ 
    id: 'load-products', 
    onLoad: service.fetchProducts 
  });
  
  // Подписываемся на результат операции
  const { result: products, isLoading } = useOperation({
    operationId: getId(service.fetchProducts)
  });
  
  if (isLoading) return <Spinner />;
  
  return (
    <div>
      {products?.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
      <button onClick={actions.refreshProducts}>
        Обновить
      </button>
    </div>
  );
}
```

`useServiceConsumer` возвращает:
- `service` — экземпляр сервиса для вызова методов в сагах
- `actions` — объект с Redux actions для методов, помеченных `@daemon`

## См. также

- [Dependency](./dependency) — базовый класс для зависимостей
- [@operation](../decorators/operation) — декоратор операции
- [@daemon](../decorators/daemon) — декоратор демона
- [useService](../hooks/use-service) — хук инициализации сервиса
- [useServiceConsumer](../hooks/use-service-consumer) — хук доступа к сервису
