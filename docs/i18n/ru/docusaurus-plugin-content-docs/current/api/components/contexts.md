# Контексты

React-контексты, предоставляемые Sagun для низкоуровневого доступа к сервисам.

## Доступные контексты

| Контекст | Описание |
|----------|----------|
| `DIContext` | Доступ к DI контейнеру |
| `ComponentLifecycleServiceContext` | Доступ к ComponentLifecycleService |
| `OperationServiceContext` | Доступ к OperationService |

## DIContext

Контекст DI контейнера. Обычно используется через `useDI()`.

```tsx
import { DIContext } from '@iiiristram/sagun';

function MyComponent() {
  const di = useContext(DIContext);
  // Эквивалентно useDI()
}
```

## ComponentLifecycleServiceContext

Контекст сервиса жизненного цикла компонентов.

```tsx
import { ComponentLifecycleServiceContext } from '@iiiristram/sagun';

function MyComponent() {
  const cls = useContext(ComponentLifecycleServiceContext);
  // Низкоуровневый доступ к ComponentLifecycleService
}
```

## OperationServiceContext

Контекст сервиса операций.

```tsx
import { OperationServiceContext } from '@iiiristram/sagun';

function MyComponent() {
  const os = useContext(OperationServiceContext);
  // Низкоуровневый доступ к OperationService
}
```

## Когда использовать

В большинстве случаев используйте хуки:
- `useDI()` вместо `useContext(DIContext)`
- `useSaga()` / `useService()` для работы с сагами

Прямой доступ к контекстам нужен для:
- Создания кастомных хуков
- Интеграции с другими библиотеками
- Тестирования

## Пример кастомного хука

```tsx
import { DIContext, OperationServiceContext } from '@iiiristram/sagun';
import { useContext, useMemo } from 'react';

function useCustomOperation<T>(id: string) {
  const di = useContext(DIContext);
  const os = useContext(OperationServiceContext);
  
  return useMemo(() => {
    // Кастомная логика работы с операциями
    return {
      create: () => os.createOperation({ operationArgs: [id] }),
      subscribe: () => os.subscribeOperation(id),
    };
  }, [id, os]);
}
```

## См. также

- [Root](./root) — провайдер контекстов
- [useDI](../hooks/use-di) — хук доступа к DI
- [OperationService](../services/operation-service) — сервис операций
- [ComponentLifecycleService](../services/component-lifecycle-service) — сервис жизненного цикла

