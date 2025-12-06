# Operations

Operations are the core data structure in Sagun. They represent the state of async actions in your application.

## AsyncOperation Type

```typescript
type AsyncOperation<TRes, TArgs, TMeta, TErr> = {
  id: OperationId<TRes, TArgs, TMeta, TErr>; // Unique identifier
  isLoading?: boolean;    // Is operation in progress
  isError?: boolean;      // Did operation fail
  isBlocked?: boolean;    // Should operation be skipped
  error?: TErr;           // Error if any
  args?: TArgs;           // Arguments operation was called with
  result?: TRes;          // Result of the operation
  meta?: TMeta;           // Additional metadata
};
```

## OperationId

`OperationId` is a branded string type that carries type information about the operation:

```typescript
// Create a typed operation ID
const FETCH_USER = 'FETCH_USER' as OperationId<User, [string], never, Error>;

// Type information is preserved
type Result = OperationFromId<typeof FETCH_USER>; 
// = AsyncOperation<User, [string], never, Error>
```

## Creating Operations

Operations are automatically created when you use the `@operation` decorator:

```typescript
class UserService extends Service {
  toString() { return 'UserService'; }

  @operation // Auto-generated ID: "USER_SERVICE_FETCH_USER"
  *fetchUser(id: string) {
    return yield* call(api.getUser, id);
  }

  @operation(CUSTOM_ID) // Custom ID
  *fetchProfile() {
    return yield* call(api.getProfile);
  }

  @operation((id) => `USER_${id}` as OperationId<User>) // Dynamic ID
  *fetchUserById(id: string) {
    return yield* call(api.getUser, id);
  }
}
```

## Reading Operations

Use `useOperation` hook to subscribe to operation state:

```tsx
function UserProfile() {
  const { service } = useServiceConsumer(UserService);
  
  const operation = useOperation({
    operationId: getId(service.fetchUser),
    suspense: false, // Don't throw Promise for Suspense
    defaultState: { isLoading: true },
  });

  if (operation.isLoading) return <Spinner />;
  if (operation.isError) return <Error error={operation.error} />;
  
  return <Profile user={operation.result} />;
}
```

## Suspense Integration

Enable Suspense mode to automatically handle loading states:

```tsx
function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <UserProfile />
    </Suspense>
  );
}

function UserProfile() {
  const { service } = useServiceConsumer(UserService);
  
  // Will throw Promise while loading (caught by Suspense)
  // Will throw error if operation failed (caught by ErrorBoundary)
  const operation = useOperation({
    operationId: getId(service.fetchUser),
    suspense: true,
  });

  // Only renders when operation is complete
  return <Profile user={operation.result} />;
}
```

## Update Strategies

Customize how operations update their state:

```typescript
@operation({
  updateStrategy: function* mergeResults(next) {
    const prev = yield* select(state => 
      state.asyncOperations.get(next.id)
    );
    
    return {
      ...next,
      result: prev?.result && next.result 
        ? [...prev.result, ...next.result] 
        : next.result,
    };
  },
})
*loadMoreItems(page: number) {
  return yield* call(api.getItems, { page });
}
```

## Operation Lifecycle

1. **Created** - Operation is added to store with `isLoading: true`
2. **Running** - Saga is executing
3. **Completed** - `isLoading: false`, `result` is set
4. **Error** - `isLoading: false`, `isError: true`, `error` is set
5. **Destroyed** - Operation is removed when no consumers remain

