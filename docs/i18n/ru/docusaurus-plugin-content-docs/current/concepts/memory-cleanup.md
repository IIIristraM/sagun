# Управление памятью

Sagun автоматически управляет памятью, очищая операции и сервисы, когда они больше не нужны. Понимание этого механизма поможет оптимизировать производительность приложения.

## Принцип работы

### Подсчёт потребителей операций

Каждая операция в Sagun отслеживает своих **потребителей** (consumers). Потребителем операции становится:
- Компонент, который вызвал `useOperation` с этой операцией
- Сервис, метод которого создал операцию через `@operation`

Когда последний потребитель отписывается от операции, она автоматически уничтожается и удаляется из Redux store.

```
┌─────────────────────────────────────────────────────────────┐
│                      Redux Store                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ asyncOperations                                     │    │
│  │   ├── "UserService/fetchUser" (consumers: 2)        │    │
│  │   ├── "OrderService/getOrders" (consumers: 1)       │    │
│  │   └── "fetch-products" (consumers: 0) ← удаляется   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Жизненный цикл сервисов

Сервисы имеют явный жизненный цикл, управляемый через `run()` и `destroy()`:

1. **Создание** — сервис создаётся через `di.createService()`
2. **Инициализация** — `useService` вызывает `run()`
3. **Работа** — сервис обрабатывает запросы, подписываясь на операции при их вызове
4. **Очистка** — при unmount `useService` вызывает `destroy()`, отписываясь от операций

```tsx
function ProductPage() {
  const di = useDI();
  const service = di.createService(ProductService);
  di.registerService(service);
  
  // При монтировании: service.run()
  // При размонтировании: service.destroy()
  const { operationId } = useService(service);
  
  return (...);
}
```

## Рекомендации по оптимизации

### Регистрируйте сервисы близко к месту использования

Чем ближе сервис зарегистрирован к компонентам, которые его используют, тем эффективнее работает очистка памяти.

```tsx
// ❌ Плохо: сервис страницы зарегистрирован в корне приложения
function App() {
  const di = useDI();
  const productService = di.createService(ProductService);
  di.registerService(productService);
  
  return <Router>...</Router>;
}// ✅ Хорошо: сервис страницы зарегистрирован на уровне страницы
function ProductPage() {
  const di = useDI();
  const productService = di.createService(ProductService);
  di.registerService(productService);
  
  return <ProductList />;
}
```

При втором подходе:
- Сервис создаётся только когда пользователь заходит на страницу
- При уходе со страницы сервис уничтожается вместе со всеми операциями
- Память освобождается автоматически

### Используйте один useSaga на компонент

Каждый вызов `useSaga` создаёт отдельную операцию. Объединяйте связанные загрузки в одну сагу:

```tsx
// ❌ Плохо: три отдельные операции
function Dashboard() {
  useSaga({ id: 'user', onLoad: fetchUser });
  useSaga({ id: 'orders', onLoad: fetchOrders });
  useSaga({ id: 'stats', onLoad: fetchStats });
  
  return (...);
}

// ✅ Хорошо: одна операция с параллельной загрузкой
function Dashboard() {
  useSaga({ 
    id: 'dashboard-data',
    onLoad: function* () {
      yield* all([
        call(fetchUser),
        call(fetchOrders),
        call(fetchStats)
      ]);
    }
  });
  
  return (...);
}
```

### Очистка в onDispose

Если сага выполняет побочные эффекты (подписки, таймеры), очищайте их в `onDispose`:

```tsx
useSaga({
  id: 'websocket',
  onLoad: function* () {
    const socket = yield* call(connectWebSocket);
    // Сохраняем ссылку для очистки
    return socket;
  },
  onDispose: function* () {
    // Вызывается при unmount или смене аргументов
    yield* call(disconnectWebSocket);
  }
});
```

## См. также

- [Сервисы](./services) — жизненный цикл сервисов
- [Операции](./operations) — как работают операции
- [useService](../api/hooks/use-service) — автоматическое управление жизненным циклом
- [useSaga](../api/hooks/use-saga) — загрузка данных с очисткой
