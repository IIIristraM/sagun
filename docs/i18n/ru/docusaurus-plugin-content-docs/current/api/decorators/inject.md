# @inject

Инъектирует зависимость в конструктор сервиса.

## Сигнатура

```typescript
// Инъекция класса (Dependency или Service)
function inject<T extends Dependency>(
  ServiceClass: new (...args: any[]) => T
): ParameterDecorator;

// Инъекция по ключу (произвольные данные)
function inject<T>(
  key: DependencyKey<T>
): ParameterDecorator;
```

## Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `key` | `InjectionKey` | Класс зависимости или `DependencyKey<T>` |

```typescript
type InjectionKey = Ctr<any> | DependencyKey<any>;
```

## Описание

Декоратор `@inject`:

1. **Помечает параметр** — указывает DI контейнеру, какую зависимость инъектировать
2. **Два типа ключей** — класс `Dependency` или строковая константа `DependencyKey<T>`
3. **Резолвит автоматически** — при создании через `di.createService()` зависимости подставляются
4. **Типобезопасен** — TypeScript проверяет соответствие типов

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

## Инъекция через DependencyKey

Для инъекции произвольных данных (не классов) используйте `DependencyKey<T>`:

```typescript
import { DependencyKey } from '@iiiristram/sagun';

// Определите тип и ключ
export type AppConfig = {
  apiUrl: string;
  debug: boolean;
};

export const CONFIG_KEY = 'APP_CONFIG' as DependencyKey<AppConfig>;
```

Зарегистрируйте данные по ключу:

```typescript
function App() {
  const di = useDI();
  
  // Регистрация данных по ключу
  const config: AppConfig = {
    apiUrl: 'https://api.example.com',
    debug: true,
  };
  di.registerDependency(CONFIG_KEY, config);
  
  // Теперь сервисы могут инъектировать config
  const service = di.createService(MyService);
}
```

Используйте в сервисе:

```typescript
import { Service, inject, OperationService } from '@iiiristram/sagun';
import { CONFIG_KEY, AppConfig } from './config';

class MyService extends Service {
  private config: AppConfig;

  constructor(
    @inject(OperationService) os: OperationService,
    @inject(CONFIG_KEY) config: AppConfig,
  ) {
    super(os);
    this.config = config;
  }

  *fetchData() {
    const url = `${this.config.apiUrl}/data`;
    return yield* call(fetch, url);
  }
}
```

## Комбинирование типов зависимостей

```typescript
class ComplexService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    // Инъекция сервиса (класс)
    @inject(AuthService) private auth: AuthService,
    // Инъекция Dependency (класс)
    @inject(Logger) private logger: Logger,
    // Инъекция данных (ключ)
    @inject(CONFIG_KEY) private config: AppConfig,
  ) {
    super(os);
  }
}
```

## См. также

- [Dependency](../services/dependency) — базовый класс зависимости
- [Service](../services/service) — класс сервиса
- [useDI](../hooks/use-di) — доступ к DI контейнеру

