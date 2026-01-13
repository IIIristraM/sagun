# Dependency

Базовый класс для всех инъектируемых зависимостей.

## Определение

```typescript
class Dependency {
  toString(): string; // Должен возвращать уникальный идентификатор
}
```

## Описание

`Dependency` — это базовый класс, который включает dependency injection в Sagun. Любой класс, наследующий `Dependency`, может быть:

- Зарегистрирован в DI контейнере
- Инъектирован в другие сервисы через декоратор `@inject`
- Получен через `useDI().getService()`

## Требования

Классы, наследующие `Dependency`, **обязаны** переопределить метод `toString()`, возвращающий уникальный идентификатор:

```typescript
class MyDependency extends Dependency {
  toString() {
    return 'MyDependency'; // Уникальный идентификатор
  }
}
```

## Пример

```typescript
import { Dependency } from '@iiiristram/sagun';

class Logger extends Dependency {
  toString() {
    return 'Logger';
  }

  log(message: string) {
    console.log(`[LOG]: ${message}`);
  }

  error(message: string) {
    console.error(`[ERROR]: ${message}`);
  }
}

// Регистрация
const di = useDI();
const logger = new Logger();
di.registerService(logger);

// Использование в другом сервисе
class UserService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(Logger) private logger: Logger,
  ) {
    super(os);
  }

  *fetchUser(id: string) {
    this.logger.log(`Загрузка пользователя ${id}`);
    // ...
  }
}
```

## См. также

- [Service](./service) — основной класс сервиса
- [@inject](../decorators/inject) — декоратор инъекции

