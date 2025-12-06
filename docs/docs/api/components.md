# Components API

## Root

Root component that provides all necessary contexts for Sagun.

### Props

```typescript
interface RootProps {
  operationService: OperationService;
  componentLifecycleService: ComponentLifecycleService;
  children: React.ReactNode;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `operationService` | `OperationService` | Core operation management service |
| `componentLifecycleService` | `ComponentLifecycleService` | Component saga lifecycle service |
| `children` | `ReactNode` | Application content |

### Example

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

### What Root Provides

- `DIContext` - Dependency injection container
- Registers `UUIDGenerator`, `OperationService`, and `ComponentLifecycleService`

## Operation

Component wrapper for `useOperation` with Suspense support.

### Props

```typescript
interface OperationProps<TRes, TArgs> {
  operationId: OperationId<TRes, TArgs>;
  children: (operation: Partial<AsyncOperation<TRes, TArgs>>) => React.ReactNode;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `operationId` | `OperationId` | Operation to subscribe to |
| `children` | `Function` | Render function receiving operation state |

### Example

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
            <p>Loading: {operation.isLoading ? 'Yes' : 'No'}</p>
          </div>
        )}
      </Operation>
    </Suspense>
  );
}
```

### With Specific Operation

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

### Nested Operations

```tsx
function Dashboard() {
  const { service: userService } = useServiceConsumer(UserService);
  const { service: statsService } = useServiceConsumer(StatsService);

  return (
    <Suspense fallback={<PageLoader />}>
      <Operation operationId={getId(userService.fetchUser)}>
        {({ result: user }) => (
          <div>
            <h1>Welcome, {user?.name}</h1>
            
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

## Contexts

### DIContext

React context for dependency injection. Use `useDI()` hook instead of consuming directly.

```typescript
const DIContext = createContext<IDIContext | null>(null);
```

### DisableSsrContext

Context to disable SSR for a subtree.

```typescript
const DisableSsrContext = createContext<boolean>(false);
```

### Example

```tsx
import { DisableSsrContext } from '@iiiristram/sagun';

function ClientOnlySection() {
  return (
    <DisableSsrContext.Provider value={true}>
      {/* Sagas in this subtree won't run on server */}
      <InteractiveWidget />
    </DisableSsrContext.Provider>
  );
}
```

