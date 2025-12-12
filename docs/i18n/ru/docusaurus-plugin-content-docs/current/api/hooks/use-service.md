# useService

Инициализирует сервис и управляет его жизненным циклом.

## Сигнатура

```typescript
function useService<TRunArgs extends any[], TRes>(
  service: BaseService<TRunArgs, TRes>,
  args: TRunArgs,
  options?: {
    ssr?: boolean;
  }
): { operationId: string };
```

## Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `service` | `BaseService` | Экземпляр сервиса для инициализации |
| `args` | `TRunArgs` | Аргументы для `service.run()` |
| `options.ssr` | `boolean?` | Включить SSR |

## Возвращаемое значение

| Поле | Тип | Описание |
|------|-----|----------|
| `operationId` | `string` | ID операции инициализации |

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

