# useDI

Предоставляет доступ к DI контейнеру.

## Сигнатура

```typescript
function useDI(): DIContainer;

interface DIContainer {
  createService<T extends Dependency>(
    ServiceClass: new (...args: any[]) => T
  ): T;
  
  registerService(service: Dependency): void;
  
  getService<T extends Dependency>(
    ServiceClass: new (...args: any[]) => T
  ): T;
}
```

## Возвращаемое значение

| Метод | Описание |
|-------|----------|
| `createService(Class)` | Создать экземпляр с автоматической инъекцией зависимостей |
| `registerService(instance)` | Зарегистрировать сервис в контейнере |
| `getService(Class)` | Получить зарегистрированный сервис |

## Описание

`useDI` — точка доступа к системе Dependency Injection в Sagun. Контейнер хранит экземпляры сервисов и автоматически резолвит зависимости при создании.

## Базовый пример

```tsx
import { useDI } from '@iiiristram/sagun';

function App() {
  const di = useDI();
  
  // Создать сервис (зависимости инъектируются автоматически)
  const userService = di.createService(UserService);
  
  // Зарегистрировать для использования другими
  di.registerService(userService);
  
  // Получить зарегистрированный сервис
  const sameService = di.getService(UserService);
  console.log(userService === sameService); // true
}
```

## Порядок регистрации

Зависимости должны быть зарегистрированы до создания сервисов, которые их используют:

```tsx
function App() {
  const di = useDI();
  
  // 1. Сначала зависимости без зависимостей
  const logger = new Logger();
  di.registerService(logger);
  
  // 2. Затем сервисы, которые от них зависят
  const userService = di.createService(UserService);
  di.registerService(userService);
  
  // 3. И сервисы, зависящие от предыдущих
  const orderService = di.createService(OrderService);
  di.registerService(orderService);
}
```

## Область видимости контейнера

Контейнер создаётся компонентом `Root` и доступен во всём поддереве:

```tsx
<Root operationService={os} componentLifecycleService={cls}>
  {/* Весь этот поддерево использует один контейнер */}
  <App />
</Root>
```

## Вложенные контейнеры

Вложенный `Root` создаёт изолированный контейнер:

```tsx
<Root operationService={os} componentLifecycleService={cls}>
  <GlobalServices />
  
  <Root operationService={os2} componentLifecycleService={cls2}>
    {/* Изолированный контейнер, не видит GlobalServices */}
    <IsolatedFeature />
  </Root>
</Root>
```

## См. также

- [Root](../components/root) — провайдер контейнера
- [Dependency](../services/dependency) — базовый класс зависимости
- [@inject](../decorators/inject) — декоратор инъекции
- [Dependency Injection](../../advanced/dependency-injection) — подробное руководство

