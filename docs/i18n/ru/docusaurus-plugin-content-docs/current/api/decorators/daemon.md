# @daemon

Делает метод автоматически управляемым по жизненному циклу сервиса.

## Сигнатура

```typescript
function daemon(
  mode?: DaemonMode,
  delay?: number
): MethodDecorator;
```

## Параметры

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `mode` | `DaemonMode` | `Trailing` | Режим выполнения демона |
| `delay` | `number` | `0` | Задержка в мс для `Schedule` режима |

## Режимы DaemonMode

| Режим | Описание |
|-------|----------|
| `Trailing` | Каждый вызов отменяет предыдущий (debounce) |
| `Leading` | Выполняется только первый вызов |
| `Every` | Выполняются все вызовы параллельно |
| `Schedule` | Повторяется с интервалом `delay` |

## Описание

Декоратор `@daemon`:

1. **Привязывает к жизненному циклу** — демоны запускаются в `run()`, останавливаются в `destroy()`
2. **Управляет вызовами** — в зависимости от режима обрабатывает конкурентные вызовы
3. **Автоматическая отмена** — незавершённые операции отменяются при `destroy()`

## Примеры

### Trailing (по умолчанию)

```typescript
class SearchService extends Service {
  @operation
  @daemon() // Trailing по умолчанию
  *search(query: string) {
    yield* delay(300); // debounce
    return yield* call(api.search, query);
  }
}

// При быстрых вызовах search('a'), search('ab'), search('abc')
// выполнится только последний search('abc')
```

### Leading

```typescript
class AuthService extends Service {
  @operation
  @daemon(DaemonMode.Leading)
  *login(credentials: Credentials) {
    return yield* call(api.login, credentials);
  }
}

// Повторные клики на кнопку логина игнорируются
```

### Every

```typescript
class UploadService extends Service {
  @operation
  @daemon(DaemonMode.Every)
  *uploadFile(file: File) {
    return yield* call(api.upload, file);
  }
}

// Каждый файл загружается параллельно
```

### Schedule

```typescript
class PollingService extends Service {
  @daemon(DaemonMode.Schedule, 5000)
  *pollUpdates() {
    const updates = yield* call(api.checkUpdates);
    if (updates.length > 0) {
      yield* put(updateReceived(updates));
    }
  }
}

// pollUpdates выполняется каждые 5 секунд пока сервис активен
```

## Без @operation

`@daemon` можно использовать без `@operation` для фоновых задач:

```typescript
class NotificationService extends Service {
  @daemon(DaemonMode.Schedule, 30000)
  *checkNotifications() {
    // Нет @operation — состояние не хранится в Redux
    yield* call(this.fetchAndShowNotifications);
  }
}
```

## См. также

- [@operation](./operation) — отслеживание операций
- [Service](../services/service) — жизненный цикл сервиса

