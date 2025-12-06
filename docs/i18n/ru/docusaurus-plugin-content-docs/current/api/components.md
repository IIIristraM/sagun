# API Компонентов

## Root

Корневой компонент, предоставляющий все необходимые контексты для Sagun.

### Props

```typescript
interface RootProps {
  operationService: OperationService;
  componentLifecycleService: ComponentLifecycleService;
  children: React.ReactNode;
}
```

| Prop | Тип | Описание |
|------|-----|----------|
| `operationService` | `OperationService` | Основной сервис управления операциями |
| `componentLifecycleService` | `ComponentLifecycleService` | Сервис жизненного цикла саг компонентов |
| `children` | `ReactNode` | Содержимое приложения |

### Пример

```tsx
import { 
  Root, 
  OperationService, 
  ComponentLifecycleService 
} from '@iiiristram/sagun';

const operationService = new OperationService();
const componentLifecycleService = new ComponentLifecycleService(operationService);

sagaMiddleware.run(function* () {
  yield* call(operationService.run);
  yield* call(componentLifecycleService.run);
});

function App() {
  return (
    <Root 
      operationService={operationService} 
      componentLifecycleService={componentLifecycleService}
    >
      <Provider store={store}>
        <AppContent />
      </Provider>
    </Root>
  );
}
```

### Что предоставляет Root

- `DIContext` — контейнер dependency injection
- Регистрирует `UUIDGenerator`, `OperationService` и `ComponentLifecycleService`

## Operation

Компонент-обёртка для `useOperation` с поддержкой Suspense.

### Props

```typescript
interface OperationProps<TRes, TArgs> {
  operationId: OperationId<TRes, TArgs>;
  children: (operation: Partial<AsyncOperation<TRes, TArgs>>) => React.ReactNode;
}
```

| Prop | Тип | Описание |
|------|-----|----------|
| `operationId` | `OperationId` | Операция для подписки |
| `children` | `Function` | Render-функция, получающая состояние операции |

### Пример

```tsx
import { Operation, useSaga, getId } from '@iiiristram/sagun';

function UserPage() {
  const { service } = useServiceConsumer(UserService);
  
  const { operationId } = useSaga({
    id: 'load-user',
    onLoad: service.fetchUser,
  });

  return (
    <Suspense fallback={<Spinner />}>
      <Operation operationId={operationId}>
        {(operation) => (
          <div>
            <h1>{operation.result?.name}</h1>
            <p>Загрузка: {operation.isLoading ? 'Да' : 'Нет'}</p>
          </div>
        )}
      </Operation>
    </Suspense>
  );
}
```

### С конкретной операцией

```tsx
function UserProfile() {
  const { service } = useServiceConsumer(UserService);
  
  return (
    <Suspense fallback={<Spinner />}>
      <Operation operationId={getId(service.fetchProfile)}>
        {({ result: profile }) => (
          <div>
            <img src={profile?.avatar} />
            <span>{profile?.name}</span>
          </div>
        )}
      </Operation>
    </Suspense>
  );
}
```

### Вложенные операции

```tsx
function Dashboard() {
  const { service: userService } = useServiceConsumer(UserService);
  const { service: statsService } = useServiceConsumer(StatsService);

  return (
    <Suspense fallback={<PageLoader />}>
      <Operation operationId={getId(userService.fetchUser)}>
        {({ result: user }) => (
          <div>
            <h1>Добро пожаловать, {user?.name}</h1>
            
            <Suspense fallback={<StatsLoader />}>
              <Operation operationId={getId(statsService.fetchStats)}>
                {({ result: stats }) => (
                  <StatsPanel stats={stats} />
                )}
              </Operation>
            </Suspense>
          </div>
        )}
      </Operation>
    </Suspense>
  );
}
```

## Контексты

### DIContext

React контекст для dependency injection. Используйте хук `useDI()` вместо прямого использования.

```typescript
const DIContext = createContext<IDIContext | null>(null);
```

### DisableSsrContext

Контекст для отключения SSR для поддерева.

```typescript
const DisableSsrContext = createContext<boolean>(false);
```

### Пример

```tsx
import { DisableSsrContext } from '@iiiristram/sagun';

function ClientOnlySection() {
  return (
    <DisableSsrContext.Provider value={true}>
      {/* Саги в этом поддереве не будут выполняться на сервере */}
      <InteractiveWidget />
    </DisableSsrContext.Provider>
  );
}
```

