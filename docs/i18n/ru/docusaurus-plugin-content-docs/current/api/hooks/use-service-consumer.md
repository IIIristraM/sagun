# useServiceConsumer

Регистрирует компонент как потребителя операций сервиса.

## Сигнатура

```typescript
function useServiceConsumer(service: BaseService): void;
```

## Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `service` | `BaseService` | Сервис, операции которого использует компонент |

## Описание

`useServiceConsumer` регистрирует компонент как потребителя всех операций сервиса. Это:

1. **Предотвращает очистку** — операции сервиса не удаляются пока есть потребители
2. **Автоматическая отписка** — при unmount компонент отписывается

## Когда использовать

Используйте `useServiceConsumer` когда компонент использует данные сервиса, но не владеет им:

```tsx
// Компонент-владелец — инициализирует сервис
function ProductPage({ categoryId }) {
  const di = useDI();
  const service = di.createService(ProductService);
  di.registerService(service);
  
  const { operationId } = useService(service, [categoryId]);
  
  return (
    <Operation operationId={operationId}>
      {() => (
        <>
          <ProductList service={service} />
          <ProductSidebar service={service} />
        </>
      )}
    </Operation>
  );
}

// Компонент-потребитель — использует данные сервиса
function ProductSidebar({ service }) {
  // Регистрируемся как потребитель
  useServiceConsumer(service);
  
  // Теперь можем безопасно использовать операции сервиса
  const operationId = getId(service.getCategories);
  const operation = useOperation(operationId);
  
  return <CategoryList categories={operation.result} />;
}
```

## Зачем нужен

Без `useServiceConsumer` операции могут быть очищены преждевременно:

```tsx
// ❌ Проблема: операция может быть очищена
function BadExample({ service }) {
  const operationId = getId(service.getData);
  const operation = useOperation(operationId);
  // Если владелец размонтируется, операция очистится
}

// ✅ Решение: зарегистрироваться как потребитель
function GoodExample({ service }) {
  useServiceConsumer(service);
  const operationId = getId(service.getData);
  const operation = useOperation(operationId);
  // Операция сохранится пока этот компонент существует
}
```

## См. также

- [useService](./use-service) — инициализация сервиса
- [useOperation](./use-operation) — подписка на операцию
- [OperationService](../services/operation-service) — управление потребителями

