# Dependency Injection

Sagun предоставляет встроенный IoC контейнер для управления зависимостями сервисов.

## Базовые концепции

### Зависимости

Любой класс, наследующий `Dependency`, может быть использован в качестве зависимости:

```typescript
import { Dependency } from '@iiiristram/sagun';

class Logger extends Dependency {
  toString() { return 'Logger'; }
  
  log(message: string) {
    console.log(`[LOG]: ${message}`);
  }
}
```

### Сервисы как зависимости

`Service` наследует `Dependency`, поэтому сервисы могут быть инъектированы в другие сервисы:

```typescript
class UserService extends Service {
  toString() { return 'UserService'; }
  
  @operation
  *fetchUser(id: string) {
    return yield* call(api.getUser, id);
  }
}

class OrderService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(UserService) private userService: UserService,
  ) {
    super(os);
  }
  
  @operation
  *createOrder(userId: string, items: Item[]) {
    // Использование инъектированного сервиса
    const user = yield* call(this.userService.fetchUser, userId);
    return yield* call(api.createOrder, { user, items });
  }
}
```

## DependencyKey

Для не-классовых зависимостей используйте `DependencyKey`:

```typescript
import { DependencyKey } from '@iiiristram/sagun';

// Определяем ключ с типом
export const API_CONFIG = 'API_CONFIG' as DependencyKey<{
  baseUrl: string;
  timeout: number;
}>;

export const FEATURE_FLAGS = 'FEATURE_FLAGS' as DependencyKey<{
  newCheckout: boolean;
  darkMode: boolean;
}>;
```

## Регистрация

### Регистрация по ключу

```tsx
function App() {
  const di = useDI();
  
  // Регистрация конфигурации
  di.registerDependency(API_CONFIG, {
    baseUrl: '/api/v2',
    timeout: 5000,
  });
  
  di.registerDependency(FEATURE_FLAGS, {
    newCheckout: true,
    darkMode: false,
  });
  
  return <Content />;
}
```

### Регистрация экземпляра сервиса

```tsx
function App() {
  const di = useDI();
  
  // Создание и регистрация
  const userService = di.createService(UserService);
  di.registerService(userService);
  
  return <Content />;
}
```

## Инъекция

### Инъекция сервиса

```typescript
class CheckoutService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(UserService) private userService: UserService,
    @inject(CartService) private cartService: CartService,
    @inject(PaymentService) private paymentService: PaymentService,
  ) {
    super(os);
  }
}
```

### Инъекция по ключу

```typescript
class ApiService extends Service {
  private config: ApiConfig;
  
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(API_CONFIG) config: ApiConfig,
  ) {
    super(os);
    this.config = config;
  }
  
  *request(endpoint: string) {
    return yield* call(fetch, `${this.config.baseUrl}${endpoint}`);
  }
}
```

## Порядок разрешения

Зависимости должны быть зарегистрированы до того, как они понадобятся:

```tsx
function App() {
  const di = useDI();
  
  // 1. Сначала регистрируем конфиг
  di.registerDependency(API_CONFIG, config);
  
  // 2. Регистрируем базовые сервисы
  const logger = di.createService(Logger);
  di.registerService(logger);
  
  const apiService = di.createService(ApiService); // Использует API_CONFIG
  di.registerService(apiService);
  
  // 3. Регистрируем зависимые сервисы
  const userService = di.createService(UserService); // Использует ApiService
  di.registerService(userService);
  
  const orderService = di.createService(OrderService); // Использует UserService
  di.registerService(orderService);
  
  return <Content />;
}
```

## Сервисы на уровне компонентов

Сервисы могут быть зарегистрированы на разных уровнях компонентов:

```tsx
// Уровень приложения — глобальные сервисы
function App() {
  const di = useDI();
  
  const authService = di.createService(AuthService);
  di.registerService(authService);
  
  return (
    <Suspense fallback={<Loader />}>
      <Router>
        <Routes>
          <Route path="/products" element={<ProductPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
      </Router>
    </Suspense>
  );
}

// Уровень страницы — сервисы, специфичные для страницы
function ProductPage() {
  const di = useDI();
  
  // ProductService существует только пока мы на этой странице
  const productService = di.createService(ProductService);
  di.registerService(productService);
  
  const { operationId } = useService(productService);
  
  return (
    <Operation operationId={operationId}>
      {() => <ProductList />}
    </Operation>
  );
}
```

## Тестирование с DI

```typescript
// Создаём mock сервис
class MockUserService extends UserService {
  toString() { return 'UserService'; }
  
  // переопределяем оригинальные методы
  *fetchUser(id: string) {
    return { id, name: 'Test User' };
  }
}

// В тесте
const di = getDIContext();
const mockUserService = new MockUserService();
di.registerService(mockUserService);

// OrderService получит mock
const orderService = di.createService(OrderService);
```

## Лучшие практики

### 1. Делайте зависимости явными

```typescript
// ✅ Хорошо — явные зависимости
class OrderService extends Service {
  constructor(
    @inject(OperationService) os: OperationService,
    @inject(UserService) private users: UserService,
    @inject(InventoryService) private inventory: InventoryService,
  ) {
    super(os);
  }
}

// ❌ Плохо — скрытые зависимости
class OrderService extends Service {
  userService = new UserService()
}
```

### 2. Избегайте циклических зависимостей

```typescript
// ❌ Циклическая зависимость
class ServiceA extends Service {
  constructor(@inject(ServiceB) private b: ServiceB) {}
}

class ServiceB extends Service {
  constructor(@inject(ServiceA) private a: ServiceA) {} // Ошибка!
}
```

