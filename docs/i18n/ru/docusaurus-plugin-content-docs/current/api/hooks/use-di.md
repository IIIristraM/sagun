# useDI

Предоставляет доступ к DI контейнеру.

## Сигнатура

```typescript
function useDI(): IDIContext;

interface IDIContext {
  // Работа с Dependency/Service (классы)
  createService<T extends Dependency>(Ctr: new (...args: any[]) => T): T;
  registerService(service: Dependency): void;
  unregisterService<T extends Dependency>(Ctr: new (...args: any[]) => T): void;
  getService<T extends Dependency>(Ctr: new (...args: any[]) => T): T;
  
  // Работа с DependencyKey (произвольные данные)
  registerDependency<D>(key: DependencyKey<D>, dependency: D): void;
  unregisterDependency<D>(key: DependencyKey<D>): void;
  getDependency<D>(key: DependencyKey<D>): D;
  
  // Создание actions для @daemon методов
  createServiceActions<T extends BaseService>(
    service: T, 
    bind?: Store
  ): ActionAPI<T>;
}
```

## Возвращаемое значение

### Работа с классами (Dependency/Service)

| Метод | Описание |
|-------|----------|
| `createService(Class)` | Создать экземпляр с автоматической инъекцией зависимостей |
| `registerService(instance)` | Зарегистрировать сервис в контейнере |
| `unregisterService(Class)` | Удалить сервис из контейнера |
| `getService(Class)` | Получить зарегистрированный сервис |

### Работа с DependencyKey (произвольные данные)

| Метод | Описание |
|-------|----------|
| `registerDependency(key, data)` | Зарегистрировать данные по ключу |
| `unregisterDependency(key)` | Удалить данные по ключу |
| `getDependency(key)` | Получить данные по ключу |

### Actions

| Метод | Описание |
|-------|----------|
| `createServiceActions(service, store?)` | Создать actions для `@daemon` методов сервиса |

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

## Регистрация данных по ключу

Для инъекции произвольных данных (не классов) используйте `DependencyKey`:

```tsx
import { DependencyKey } from '@iiiristram/sagun';

// Определите тип и ключ
type AppConfig = { apiUrl: string };
const CONFIG_KEY = 'APP_CONFIG' as DependencyKey<AppConfig>;

function App() {
  const di = useDI();
  
  // Зарегистрировать данные по ключу
  di.registerDependency(CONFIG_KEY, { apiUrl: 'https://api.example.com' });
  
  // Получить данные
  const config = di.getDependency(CONFIG_KEY);
  
  // Сервисы могут инъектировать через @inject(CONFIG_KEY)
  const service = di.createService(MyService);
}
```

## Область видимости контейнера

Контейнер создаётся компонентом `Root` и доступен во всём поддереве:

```tsx
<Root operationService={os} componentLifecycleService={cls}>
  {/* Всё это поддерево использует один контейнер */}
  <App />
</Root>
```

## См. также

- [Root](../components/root) — провайдер контейнера
- [Dependency](../services/dependency) — базовый класс зависимости
- [@inject](../decorators/inject) — декоратор инъекции
- [Dependency Injection](../../advanced/dependency-injection) — подробное руководство

