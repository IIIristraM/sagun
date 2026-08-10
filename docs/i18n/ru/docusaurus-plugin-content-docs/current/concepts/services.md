# Сервисы

Сервисы — это основные контейнеры для бизнес-логики в Sagun. Они инкапсулируют связанную функциональность и управляют собственным жизненным циклом.

## Иерархия сервисов

```
Dependency (базовый класс)
    └── Service (демоны, жизненный цикл)
            └── CustomService (бизнес логика)
```

## Создание сервиса

```typescript
import { Service, operation, daemon } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

class ProductService extends Service {
  // ОБЯЗАТЕЛЬНО: уникальный идентификатор
  toString() {
    return 'ProductService';
  }

  @operation
  @daemon()
  *fetchProducts(category: string) {
    const products = yield* call(api.getProducts, category);
    return products;
  }
}
```

## Жизненный цикл сервиса

### Инициализация

Сервисы инициализируются с помощью хука `useService`:

```tsx
function ProductPage() {
  const di = useDI();
  const service = di.createService(ProductService);
  di.registerService(service);
  
  // Вызывает service.run() и service.destroy() на unmount компонента
  const { operationId } = useService(service);
  
  return (
    <Operation operationId={operationId}>
      {() => <ProductList />}
    </Operation>
  );
}
```

### Кастомные run и destroy

Переопределите `run` и `destroy` для пользовательской логики жизненного цикла:

```typescript
class ProductService extends Service<[string], Product[]> {
  private category: string = '';
  
  toString() { return 'ProductService'; }

  *run(category: string) {
    // ВАЖНО: сначала вызовите super.run()
    yield* call([this, super.run]);
    
    this.category = category;
    
    // Пользовательская инициализация
    return yield* call(this.fetchProducts, category);
  }

  *destroy() {
    // ВАЖНО: вызовите super.destroy()
    yield* call([this, super.destroy]);
    
    // Пользовательская очистка
    this.category = '';
  }

  @operation
  *fetchProducts(category: string) {
    return yield* call(api.getProducts, category);
  }
}
```

### Статус сервиса

```typescript
service.getStatus(); // 'unavailable' | 'ready'
service.getUUID();   // Уникальный ID экземпляра
```

## Режимы демонов

Декоратор `@daemon` делает методы вызываемыми через Redux actions:

```typescript
import { daemon, DaemonMode } from '@iiiristram/sagun';

class SearchService extends Service {
  toString() { return 'SearchService'; }

  // DaemonMode.Sync (по умолчанию) — ждать завершения предыдущего вызова
  @daemon()
  *loadPage(page: number) { /* ... */ }

  // DaemonMode.Last — отменить предыдущий вызов, выполнить последний (takeLatest)
  @daemon(DaemonMode.Last)
  *search(query: string) { /* ... */ }

  // DaemonMode.Every — выполнять все вызовы параллельно (takeEvery)
  @daemon(DaemonMode.Every)
  *trackEvent(event: string) { /* ... */ }

  // DaemonMode.Schedule — периодическое выполнение
  @daemon(DaemonMode.Schedule, 30000) // Каждые 30 секунд
  *pollUpdates() { /* ... */ }
}
```

## Вызов методов сервиса

### Из компонентов (через actions)

```tsx
function SearchForm() {
  const { actions } = useServiceConsumer(SearchService);
  
  return (
    <input onChange={(e) => actions.search(e.target.value)} />
  );
}
```

### Из других саг

```typescript
import { inject, OperationService } from '@iiiristram/sagun';

class OrderService extends Service {
  constructor(
    @inject(OperationService) operationService: OperationService,
    @inject(AnalyticsService) private analytics: AnalyticsService,
  ) {
    super(operationService);
  }

  @operation
  *createOrder(items: Item[]) {
    const order = yield* call(api.createOrder, items);
    
    // Прямой вызов метода другого сервиса
    yield* call(this.analytics.trackEvent, 'order_created');
    
    return order;
  }
}
```

## Лучшие практики

### 1. Единственная ответственность

Каждый сервис должен обрабатывать один домен:

```typescript
// ✅ Хорошо
class UserService extends Service { /* операции с пользователями */ }
class AuthService extends Service { /* операции аутентификации */ }

// ❌ Плохо
class UserAndAuthService extends Service { /* смешано */ }
```

### 2. Используйте Dependency Injection

```typescript
class OrderService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(UserService) private userService: UserService,
    @inject(CartService) private cartService: CartService,
  ) {
    super(os);
  }
}
```

### 3. Делайте методы сфокусированными

```typescript
class ProductService extends Service {
  // ✅ Сфокусированные методы
  @operation
  *fetchProduct(id: string) { /* ... */ }
  
  @operation  
  *fetchProductReviews(id: string) { /* ... */ }
  
  // ❌ Избегайте god-методов
  *fetchProductWithReviewsAndRelatedAndCart() { /* ... */ }
}
```
