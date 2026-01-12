# useService

Инициализирует сервис и управляет его жизненным циклом.

## Сигнатура

```typescript
// Один сервис
function useService<TArgs extends any[], TRes>(
  service: BaseService<TArgs, TRes>,
  args?: TArgs,
  options?: UseSagaOptions<TArgs, TRes>
): UseSagaOutput<TRes, TArgs>;

// Массив сервисов (все получат одинаковые args)
function useService<TArgs extends any[], TRes>(
  services: Array<BaseService<TArgs, any>>,
  args?: TArgs,
  options?: UseSagaOptions<TArgs, TRes>
): UseSagaOutput<TRes, TArgs>;

type UseSagaOutput<TRes, TArgs> = {
  operationId: OperationId<TRes, TArgs>;
  reload: () => void;
};
```

## Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `service` | `BaseService \| BaseService[]` | Сервис или массив сервисов для инициализации |
| `args` | `TArgs` | Аргументы для `service.run()` (по умолчанию `[]`) |
| `options.operationOptions.updateStrategy` | `function?` | Стратегия обновления операции |

## Возвращаемое значение

| Поле | Тип | Описание |
|------|-----|----------|
| `operationId` | `OperationId` | ID операции инициализации |
| `reload` | `() => void` | Функция для принудительного перезапуска |

## Описание

`useService` управляет жизненным циклом сервиса:

1. **На mount** — вызывает `service.run(...args)`
2. **При изменении args** — вызывает `service.destroy()`, затем `service.run()` с новыми args
3. **На unmount** — вызывает `service.destroy()`

## Базовый пример

```tsx
import { useDI, useService, Operation } from '@iiiristram/sagun';

function ProductPage({ categoryId }) {
  const di = useDI();
  
  // Создать и зарегистрировать сервис
  const service = di.createService(ProductService);
  di.registerService(service);
  
  // Инициализировать с аргументами
  const { operationId } = useService(service, [categoryId]);
  
  return (
    <Suspense fallback={<Spinner />}>
      <Operation operationId={operationId}>
        {() => <ProductList service={service} />}
      </Operation>
    </Suspense>
  );
}
```

## С несколькими аргументами

```tsx
function FilteredProducts({ categoryId, sortBy, filters }) {
  const di = useDI();
  const service = di.createService(ProductService);
  di.registerService(service);
  
  // Сервис перезапустится при изменении любого аргумента
  const { operationId } = useService(service, [categoryId, sortBy, filters]);
  
  return (
    <Operation operationId={operationId}>
      {() => <ProductGrid />}
    </Operation>
  );
}
```

## Сервис с зависимостями

```tsx
function OrderPage() {
  const di = useDI();
  
  // Сначала зарегистрируйте зависимости
  const userService = di.createService(UserService);
  const cartService = di.createService(CartService);
  di.registerService(userService);
  di.registerService(cartService);
  
  // Затем создайте сервис, который от них зависит
  const orderService = di.createService(OrderService);
  di.registerService(orderService);
  
  const { operationId } = useService(orderService, []);
  
  return (
    <Operation operationId={operationId}>
      {() => <OrderForm service={orderService} />}
    </Operation>
  );
}
```

## Инициализация нескольких сервисов

Можно инициализировать несколько сервисов одновременно:

```tsx
function Dashboard() {
  const di = useDI();
  
  const userService = di.createService(UserService);
  const statsService = di.createService(StatsService);
  const notificationService = di.createService(NotificationService);
  
  di.registerService(userService);
  di.registerService(statsService);
  di.registerService(notificationService);
  
  // Все сервисы инициализируются параллельно
  const { operationId } = useService(
    [userService, statsService, notificationService],
    []
  );
  
  return (
    <Operation operationId={operationId}>
      {() => <DashboardContent />}
    </Operation>
  );
}
```

## С reload

```tsx
function RefreshableData() {
  const di = useDI();
  const service = di.createService(DataService);
  di.registerService(service);
  
  const { operationId, reload } = useService(service, []);
  
  return (
    <div>
      <button onClick={reload}>Обновить данные</button>
      <Operation operationId={operationId}>
        {() => <DataView />}
      </Operation>
    </div>
  );
}
```

## Паттерн вложенных сервисов

```tsx
function App() {
  const di = useDI();
  
  // Глобальный сервис
  const authService = di.createService(AuthService);
  di.registerService(authService);
  
  return (
    <AuthProvider service={authService}>
      <ProductPage />
    </AuthProvider>
  );
}

function ProductPage() {
  const di = useDI();
  
  // Локальный сервис для этой страницы
  // AuthService уже доступен для инъекции
  const productService = di.createService(ProductService);
  di.registerService(productService);
  
  const { operationId } = useService(productService, []);
  // ...
}
```

## См. также

- [Service](../services/service) — класс сервиса
- [useSaga](./use-saga) — для простых саг без сервиса
- [useDI](./use-di) — работа с DI контейнером

