# @daemon

Makes method callable via Redux action.

## Signatures

```typescript
// Default mode (Sync)
@daemon()
*method() { }

// Specific mode
@daemon(mode: DaemonMode)
*method() { }

// Mode with custom action pattern
@daemon(mode: DaemonMode, action: Pattern<any>)
*method() { }

// Schedule mode with interval
@daemon(DaemonMode.Schedule, intervalMs: number)
*method() { }
```

## DaemonMode

```typescript
enum DaemonMode {
  Sync = 'SYNC',        // Block until previous completes
  Every = 'EVERY',      // Run all in parallel (takeEvery)
  Last = 'LAST',        // Cancel previous (takeLatest)
  Schedule = 'SCHEDULE' // Run periodically
}
```

| Mode | Behavior | Use Case |
|------|----------|----------|
| `Sync` | Wait for previous call to complete | Form submissions, navigation |
| `Every` | Run all calls in parallel | Analytics, logging |
| `Last` | Cancel previous, run latest | Search, autocomplete |
| `Schedule` | Run periodically | Polling, heartbeat |

## Basic Usage

```typescript
class FormService extends Service {
  toString() { return 'FormService'; }

  // Sync mode (default) - wait for previous to complete
  @daemon()
  *submitForm(data: FormData) {
    return yield* call(api.submit, data);
  }
}
```

## DaemonMode.Last

Cancel previous call when new one arrives (like `takeLatest`):

```typescript
class SearchService extends Service {
  toString() { return 'SearchService'; }

  @daemon(DaemonMode.Last)
  *search(query: string) {
    yield* delay(300); // Debounce
    return yield* call(api.search, query);
  }
}
```

## DaemonMode.Every

Run all calls in parallel (like `takeEvery`):

```typescript
class AnalyticsService extends Service {
  toString() { return 'AnalyticsService'; }

  @daemon(DaemonMode.Every)
  *trackEvent(event: string, data: object) {
    yield* call(analytics.track, event, data);
  }
}
```

## DaemonMode.Schedule

Run periodically:

```typescript
class NotificationService extends Service {
  toString() { return 'NotificationService'; }

  @daemon(DaemonMode.Schedule, 10000) // Every 10 seconds
  *pollNotifications() {
    return yield* call(api.getNotifications);
  }
}
```

## Custom Action Pattern

Listen to external Redux actions:

```typescript
class RouterService extends Service {
  toString() { return 'RouterService'; }

  @daemon(DaemonMode.Every, 'LOCATION_CHANGE')
  *onRouteChange(action: LocationChangeAction) {
    yield* call(this.handleNavigation, action.payload);
  }
}
```

## Calling Daemon Methods

Use `useServiceConsumer` to get bound actions:

```tsx
function SearchForm() {
  const { actions } = useServiceConsumer(SearchService);
  
  return (
    <input 
      onChange={(e) => actions.search(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

## Combining with @operation

```typescript
class UserService extends Service {
  toString() { return 'UserService'; }

  @operation  // Save result to store
  @daemon()   // Make callable via action
  *fetchUser(id: string) {
    return yield* call(api.getUser, id);
  }
}
```

## See Also

- [@operation](./operation) - Save result to store
- [useServiceConsumer](../hooks/use-service-consumer) - Get service actions
- [Service](../services/service) - Service class

