# BaseService

Базовый класс с поддержкой демонов и управлением жизненным циклом.

## Определение

```typescript
class BaseService<TRunArgs extends any[] = [], TRes = void> extends Dependency {
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
| `run(...args)` | Инициализация сервиса, запуск демонов, статус `ready` |
| `destroy(...args)` | Очистка сервиса, остановка демонов, статус `unavailable` |
| `getStatus()` | Получить текущий статус: `'unavailable'` или `'ready'` |
| `getUUID()` | Получить уникальный идентификатор экземпляра |

## Описание

`BaseService` расширяет [Dependency](./dependency) и добавляет:

- **Управление жизненным циклом** через методы `run()` и `destroy()`
- **Поддержка демонов** для методов с декоратором `@daemon`
- **Отслеживание статуса** — готов ли сервис
- **Уникальный ID экземпляра** для идентификации

## Жизненный цикл

1. Сервис создаётся со статусом `'unavailable'`
2. Вызывается `run()` → запускаются все демоны → статус становится `'ready'`
3. Вызывается `destroy()` → останавливаются все демоны → статус становится `'unavailable'`

## Пример

```typescript
import { BaseService, daemon, DaemonMode } from '@iiiristram/sagun';
import { call, delay } from 'typed-redux-saga';

class PollingService extends BaseService {
  toString() {
    return 'PollingService';
  }

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

## Переопределение методов жизненного цикла

```typescript
class MyService extends BaseService<[string], Data> {
  private data: Data | null = null;

  toString() {
    return 'MyService';
  }

  *run(id: string) {
    // ВАЖНО: сначала вызовите super.run()
    yield* call([this, super.run]);
    
    // Пользовательская инициализация
    this.data = yield* call(api.fetchData, id);
    
    return this.data;
  }

  *destroy() {
    // ВАЖНО: вызовите super.destroy()
    yield* call([this, super.destroy]);
    
    // Пользовательская очистка
    this.data = null;
  }
}
```

## См. также

- [Dependency](./dependency) — базовый класс
- [Service](./service) — сервис с интеграцией OperationService
- [@daemon](../decorators/daemon) — декоратор демона

