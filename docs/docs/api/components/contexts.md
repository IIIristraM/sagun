# Contexts

React contexts provided by Sagun.

## DIContext

Context for dependency injection. **Use `useDI()` hook** instead of consuming directly.

```typescript
import { createContext } from 'react';

const DIContext = createContext<IDIContext | null>(null);
```

### Usage

```tsx
// ❌ Don't use directly
const di = useContext(DIContext);

// ✅ Use the hook
import { useDI } from '@iiiristram/sagun';
const di = useDI();
```

### Provided By

DIContext is automatically provided by the [Root](./root) component.

## DisableSsrContext

Context to disable SSR for a subtree of components.

```typescript
const DisableSsrContext = createContext<boolean>(false);
```

### Usage

Wrap components that should only run on the client:

```tsx
import { DisableSsrContext } from '@iiiristram/sagun';

function App() {
  return (
    <div>
      {/* These will run on server */}
      <Header />
      <ProductList />
      
      {/* These will NOT run on server */}
      <DisableSsrContext.Provider value={true}>
        <InteractiveChat />
        <LiveNotifications />
        <UserPresence />
      </DisableSsrContext.Provider>
    </div>
  );
}
```

### When to Use

Use `DisableSsrContext` for components that:

- Require browser APIs (localStorage, WebSocket, etc.)
- Have real-time updates not needed for initial render
- Would slow down server render without benefit
- Use client-only third-party libraries

### Effect on Sagas

When `DisableSsrContext` is `true`:

- `useSaga` `onLoad` won't execute on server
- `useService` won't call `service.run()` on server
- Operations won't be collected in SSR hash

```tsx
function LiveChat() {
  const { operationId } = useSaga({
    id: 'chat',
    onLoad: function* () {
      // This won't run on server when wrapped in DisableSsrContext
      yield* call(connectWebSocket);
    },
  });
  
  return <ChatUI />;
}
```

## See Also

- [Root](./root) - Provides DIContext
- [useDI](../hooks/use-di) - Access DI context
- [SSR Guide](../../advanced/ssr) - Server-side rendering

