# Service

Основной класс для пользовательских сервисов с интеграцией OperationService.

## Определение

```typescript
class Service<TRunArgs extends any[] = [], TRes = void> 
  extends BaseService<TRunArgs, TRes> {
  
  protected _operationsService: OperationService;
  
  constructor(@inject(OperationService) operationService: OperationService);
}
```

## Параметры типов

| Параметр | Описание |
|----------|----------|
| `TRunArgs` | Тип кортежа аргументов метода `run()` |
| `TRes` | Тип возвращаемого значения метода `run()` |

## Описание

`Service` — это основной класс, от которого следует наследоваться при создании собственных сервисов. Он:

- Расширяет [BaseService](./base-service) со всеми его возможностями
- Интегрируется с [OperationService](./operation-service) для управления операциями
- Автоматически обрабатывает очистку операций при `destroy()`

## Базовый пример

```typescript
import { Service, operation, daemon } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

class UserService extends Service {
  // ОБЯЗАТЕЛЬНО: уникальный идентификатор
  toString() {
    return 'UserService';
  }

  @operation
  @daemon()
  *fetchUser(id: string) {
    return yield* call(api.getUser, id);
  }

  @operation
  *updateUser(id: string, data: UserData) {
    return yield* call(api.updateUser, id, data);
  }
}
```

## С пользовательской инициализацией

```typescript
class ProductService extends Service<[string], Product[]> {
  private categoryId: string = '';

  toString() {
    return 'ProductService';
  }

  *run(categoryId: string) {
    // Сначала вызовите super.run()
    yield* call([this, super.run]);
    
    this.categoryId = categoryId;
    
    // Загрузка начальных данных
    return yield* call(this.fetchProducts);
  }

  *destroy() {
    // Вызовите super.destroy()
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

## См. также

- [BaseService](./base-service) — базовый класс
- [OperationService](./operation-service) — управление операциями
- [@operation](../decorators/operation) — декоратор операции
- [@daemon](../decorators/daemon) — декоратор демона
- [useService](../hooks/use-service) — хук инициализации сервиса

