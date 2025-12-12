# OperationService

Основной сервис, управляющий жизненным циклом операций.

## Определение

```typescript
class OperationService extends BaseService {
  constructor(options?: { hash?: SagaClientHash });
  
  createOperation(options: {
    operationArgs: Parameters<typeof createOperation>;
    ssr?: boolean;
  }): Operation;
  
  subscribeOperation(operationId: string): Promise<unknown>;
  getHash(): SagaClientHash | undefined;
  registerConsumer(consumer: object, operationId: string): void;
  unregisterConsumer(consumer: object, operationId?: string): void;
}
```

## Параметры конструктора

| Опция | Тип | Описание |
|-------|-----|----------|
| `hash` | `SagaClientHash` | Хэш контекста SSR для гидрации |

## Методы

| Метод | Описание |
|-------|----------|
| `createOperation(options)` | Создать и зарегистрировать операцию |
| `subscribeOperation(id)` | Подписаться на завершение операции (возвращает Promise) |
| `getHash()` | Получить SSR хэш для сериализации |
| `registerConsumer(consumer, operationId)` | Зарегистрировать потребителя операции |
| `unregisterConsumer(consumer, operationId?)` | Отменить регистрацию, очистить если нет потребителей |

## Описание

`OperationService` — это основной сервис, который управляет жизненным циклом всех операций в Sagun. Он:

- Создаёт и отслеживает операции
- Управляет подписками потребителей
- Обрабатывает сериализацию/гидрацию данных SSR
- Очищает операции, когда не остаётся потребителей

## Базовая настройка

```typescript
import { OperationService, ComponentLifecycleService } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

const operationService = new OperationService();
const componentLifecycleService = new ComponentLifecycleService(operationService);

sagaMiddleware.run(function* () {
  yield* call(operationService.run);
  yield* call(componentLifecycleService.run);
});
```

## Настройка SSR

```typescript
// Сервер
const operationService = new OperationService({ hash: {} });

// После рендеринга
const ssrHash = operationService.getHash();
// Сериализовать на клиент: window.__SSR_CONTEXT__ = ssrHash

// Клиент
const operationService = new OperationService({ 
  hash: window.__SSR_CONTEXT__ 
});
// Операции с ssr: true не будут повторно выполняться, если args совпадают
```

## Жизненный цикл операции

1. Операция создаётся через декоратор `@operation` или `createOperation()`
2. Потребители регистрируются через `registerConsumer()`
3. Операция выполняется и обновляет Redux store
4. Когда все потребители отписываются, операция уничтожается

## Внутреннее использование

`OperationService` в основном используется внутри:

- Декоратором `@operation`
- Хуком `useOperation`
- `ComponentLifecycleService`

Обычно вам не нужно вызывать его методы напрямую.

## См. также

- [Service](./service) — класс пользовательского сервиса
- [ComponentLifecycleService](./component-lifecycle-service) — жизненный цикл компонентов
- [@operation](../decorators/operation) — декоратор операции
- [Руководство по SSR](../../advanced/ssr) — серверный рендеринг

