# API Сервисов

## Dependency

Базовый класс для всех инъектируемых зависимостей.

```typescript
class Dependency {
  toString(): string; // Должен возвращать уникальный идентификатор
}
```

## BaseService

Базовый класс с поддержкой демонов и управлением жизненным циклом.

```typescript
class BaseService<TRunArgs extends any[] = [], TRes = void> extends Dependency {
  *run(...args: TRunArgs): Generator<any, TRes | undefined>;
  *destroy(...args: TRunArgs): Generator<any, void>;
  getStatus(): 'unavailable' | 'ready';
  getUUID(): string;
}
```

### Методы

| Метод | Описание |
|-------|----------|
| `run(...args)` | Инициализация сервиса, запуск демонов, статус `ready` |
| `destroy(...args)` | Очистка сервиса, остановка демонов, статус `unavailable` |
| `getStatus()` | Получить текущий статус сервиса |
| `getUUID()` | Получить уникальный идентификатор экземпляра |

## Service

Основной класс для пользовательских сервисов с интеграцией OperationService.

```typescript
class Service<TRunArgs extends any[] = [], TRes = void> 
  extends BaseService<TRunArgs, TRes> {
  
  protected _operationsService: OperationService;
  
  constructor(@inject(OperationService) operationService: OperationService);
}
```

### Пример

```typescript
class MyService extends Service<[string], Data> {
  toString() { return 'MyService'; }
  
  *run(id: string) {
    yield* call([this, super.run]);
    return yield* call(this.fetchData, id);
  }
  
  @operation
  *fetchData(id: string) {
    return yield* call(api.fetch, id);
  }
}
```

## OperationService

Основной сервис, управляющий жизненным циклом операций.

```typescript
class OperationService extends BaseService {
  constructor(options?: { hash?: SagaClientHash });
  
  createOperation(options: {
    operationArgs: Parameters<typeof createOperation>;
    ssr?: boolean;
  }): Operation;
  
  subscribeOperation(operationId: string): Promise<unknown>;
  getHash(): SagaClientHash | undefined;
}
```

### Параметры конструктора

| Опция | Тип | Описание |
|-------|-----|----------|
| `hash` | `SagaClientHash` | Хэш контекста SSR для гидрации |

### Методы

| Метод | Описание |
|-------|----------|
| `createOperation(options)` | Создать и зарегистрировать операцию |
| `subscribeOperation(id)` | Подписаться на завершение операции (возвращает Promise) |
| `getHash()` | Получить SSR хэш для сериализации |
| `registerConsumer(consumer, operationId)` | Зарегистрировать потребителя операции |
| `unregisterConsumer(consumer, operationId?)` | Отменить регистрацию потребителя |

## ComponentLifecycleService

Управляет жизненным циклом саг компонентов (useSaga/useService).

```typescript
class ComponentLifecycleService extends Service {
  scheduleExecution<TArgs>(options: LoadOptions<TArgs, any>): void;
  getCurrentExecution(operationId: string): LoadOptions | undefined;
}
```

### Методы

| Метод | Описание |
|-------|----------|
| `load(operationId)` | Запустить цикл загрузки (демон) |
| `cleanup({ operationId })` | Очистка при размонтировании (демон) |
| `scheduleExecution(options)` | Запланировать следующее выполнение |
| `getCurrentExecution(id)` | Получить текущее состояние выполнения |

## UUIDGenerator

Утилитарный сервис для генерации уникальных ID.

```typescript
class UUIDGenerator extends Dependency {
  toString(): 'UUIDGenerator';
  uuid(prefix?: string): string;
}
```

