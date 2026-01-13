# Operations

Operations are the core data structure in Sagun. They represent the state of async actions in your application.
The store in the application is a dictionary where you can get an operation by key.

This approach allows you to unify work with the application state.

## Types

Operations are described by the following contract:

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

`OperationId` is a type describing the operation key, from which you can extract the main information about the operation parameters (argument type, result, etc.):

```typescript
// Create a typed operation ID
const FETCH_USER = 'FETCH_USER' as OperationId<User, [string], never, Error>;

// Type information is preserved
type Result = OperationFromId<typeof FETCH_USER>; 
// = AsyncOperation<User, [string], never, Error>
```

## Operation Lifecycle

1. **Created** — `isLoading: false`, `result: undefined`
2. **Running** — `isLoading: true`, `result: undefined`
3. **Completed** — `isLoading: false`, `result` is set
4. **Error** — `isLoading: false`, `isError: true`, `error` is set

## Creating Operations

Operations are automatically created when you use the `@operation` decorator or `useSaga` and `useService` hooks:

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

```tsx
const { operationId } = useSaga({ id, onLoad })
```

## Reading Operations

Use `useOperation` hook to subscribe to operation state:

```tsx
function UserProfile() {
  const { service } = useServiceConsumer(UserService);
  
  const operation = useOperation({
    operationId: getId(service.fetchUser),
    suspense: false, // Don't throw Promise for Suspense
    defaultState: { isLoading: true }, // fallback if operation doesn't exist yet
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

Customize how operation state updates:

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

:::info

The strategy is applied each time before writing the operation state to the store. On each operation call, this happens twice — before and after executing its body.

:::