# @daemon

Позволяет вызывать методы сервиса, как redux actions

## Сигнатуры

```typescript
// Режим по умолчанию (Sync)
@daemon()
*method() { }

// С указанием режима
@daemon(mode: DaemonMode)
*method() { }

// С режимом и кастомным action pattern
// позволяет привязать вызов метода к любому кастомному redux экшену
@daemon(mode: DaemonMode, action: Pattern<any>)
*method() { }

// Режим Schedule с интервалом
@daemon(DaemonMode.Schedule, intervalMs: number)
*method() { }
```

## Режимы DaemonMode

```typescript
enum DaemonMode {
  Sync = 'SYNC',        // Блокирует до завершения предыдущего
  Every = 'EVERY',      // Параллельное выполнение (takeEvery)
  Last = 'LAST',        // Отменяет предыдущий (takeLatest)
  Schedule = 'SCHEDULE' // Периодическое выполнение
}
```

| Режим | Описание | Применение |
|-------|----------|------------|
| `Sync` | Ждёт завершения предыдущего вызова | Отправка форм, навигация |
| `Every` | Выполняются все вызовы параллельно | Аналитика, логирование |
| `Last` | Каждый вызов отменяет предыдущий | Поиск, автодополнение |
| `Schedule` | Повторяется с заданным интервалом | Polling, heartbeat |

## Описание

Декоратор `@daemon`:

1. **Привязывает к жизненному циклу** — демоны запускаются в `run()`, останавливаются в `destroy()`
2. **Управляет вызовами** — в зависимости от режима обрабатывает конкурентные вызовы
3. **Автоматическая отмена** — незавершённые операции отменяются при `destroy()`

## Примеры

### Sync (по умолчанию)

```typescript
class FormService extends Service {
  toString() { return 'FormService'; }

  @operation
  @daemon() // Sync по умолчанию — ждёт завершения предыдущего
  *submitForm(data: FormData) {
    return yield* call(api.submit, data);
  }
}

// Повторные клики на кнопку отправки игнорируются,
// пока предыдущий запрос не завершится
```

### Last

```typescript
class SearchService extends Service {
  toString() { return 'SearchService'; }

  @operation
  @daemon(DaemonMode.Last)
  *search(query: string) {
    yield* delay(300); // debounce
    return yield* call(api.search, query);
  }
}

// При быстрых вызовах search('a'), search('ab'), search('abc')
// выполнится только последний search('abc')
```

### Every

```typescript
class AnalyticsService extends Service {
  toString() { return 'AnalyticsService'; }

  @daemon(DaemonMode.Every)
  *trackEvent(event: string, data: object) {
    yield* call(analytics.track, event, data);
  }
}

// Каждое событие отправляется параллельно
```

### Schedule

```typescript
class NotificationService extends Service {
  toString() { return 'NotificationService'; }

  @daemon(DaemonMode.Schedule, 10000) // Каждые 10 секунд
  *pollNotifications() {
    return yield* call(api.getNotifications);
  }
}

// pollNotifications выполняется каждые 10 секунд пока сервис активен
```

## Кастомный action pattern

Можно подписаться на внешние Redux actions:

```typescript
class RouterService extends Service {
  toString() { return 'RouterService'; }

  @daemon(DaemonMode.Every, 'LOCATION_CHANGE')
  *onRouteChange(action: LocationChangeAction) {
    yield* call(this.handleNavigation, action.payload);
  }
}
```

## Вызов daemon-методов

Используйте `useServiceConsumer` для получения привязанных actions:

```tsx
function SearchForm() {
  const { actions } = useServiceConsumer(SearchService);
  
  return (
    <input 
      onChange={(e) => actions.search(e.target.value)}
      placeholder="Поиск..."
    />
  );
}
```

## Комбинация с @operation

```typescript
class UserService extends Service {
  toString() { return 'UserService'; }

  @operation  // Сохранить результат в store
  @daemon()   // Сделать вызываемым через action
  *fetchUser(id: string) {
    return yield* call(api.getUser, id);
  }
}
```

## См. также

- [@operation](./operation) — сохранение результата в store
- [useServiceConsumer](../hooks/use-service-consumer) — получение actions сервиса
- [Service](../services/service) — жизненный цикл сервиса

