# @inject

Инъектирует зависимость в конструктор сервиса.

## Сигнатура

```typescript
function inject<T extends Dependency>(
  ServiceClass: new (...args: any[]) => T
): ParameterDecorator;
```

## Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `ServiceClass` | `Class` | Класс зависимости для инъекции |

## Описание

Декоратор `@inject`:

1. **Помечает параметр** — указывает DI контейнеру, какую зависимость инъектировать
2. **Резолвит автоматически** — при создании через `di.createService()` зависимости подставляются
3. **Типобезопасен** — TypeScript проверяет соответствие типов

## Базовый пример

```typescript
import { Service, inject, OperationService } from '@iiiristram/sagun';

class UserService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
  ) {
    super(os);
  }
}
```

## С несколькими зависимостями

```typescript
import { Service, inject, OperationService, Dependency } from '@iiiristram/sagun';

class Logger extends Dependency {
  toString() { return 'Logger'; }
  log(msg: string) { console.log(msg); }
}

class ApiClient extends Dependency {
  toString() { return 'ApiClient'; }
  fetch(url: string) { return fetch(url); }
}

class DataService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(Logger) private logger: Logger,
    @inject(ApiClient) private api: ApiClient,
  ) {
    super(os);
  }

  @operation
  *fetchData() {
    this.logger.log('Загрузка данных...');
    return yield* call([this.api, this.api.fetch], '/data');
  }
}
```

## Регистрация и создание

```typescript
import { useDI } from '@iiiristram/sagun';

function App() {
  const di = useDI();
  
  // Зарегистрировать зависимости
  di.registerService(new Logger());
  di.registerService(new ApiClient());
  
  // Создать сервис — зависимости инъектируются автоматически
  const dataService = di.createService(DataService);
  di.registerService(dataService);
}
```

## Порядок параметров

`OperationService` должен быть первым параметром для классов, наследующих `Service`:

```typescript
class MyService extends Service {
  constructor(
    @inject(OperationService) os: OperationService, // Первый
    @inject(Logger) private logger: Logger,          // Остальные
    @inject(ApiClient) private api: ApiClient,
  ) {
    super(os); // Передать в super
  }
}
```

## См. также

- [Dependency](../services/dependency) — базовый класс зависимости
- [Service](../services/service) — класс сервиса
- [useDI](../hooks/use-di) — доступ к DI контейнеру

