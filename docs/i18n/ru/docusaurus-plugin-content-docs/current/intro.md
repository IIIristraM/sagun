# Введение

**Sagun** — это строго типизированная сервис-ориентированная изоморфная архитектура, построенная на базе [redux-saga](https://redux-saga.js.org/).

## Основные принципы

1. **Бизнес-логика отделена от компонентов** — ваши React компоненты остаются чистыми и сфокусированными на UI
2. **Бизнес-логика разбита на небольшие сервисы** — лучшая организация и тестируемость
3. **Минимум Redux boilerplate** — единый reducer для всех операций, автогенерация actions
4. **Совместимость с SSR** — серверный рендеринг без дублирования логики
5. **Dependency Injection** — встроенный DI контейнер с TypeScript декораторами
6. **Полная типизация** — полностью написан на TypeScript

## Требования

- React 16+ (поддержка 16, 17, 18, 19)
- Redux и React-Redux
- Redux-Saga
- Immutable.js ^4.0.0
- TypeScript с `experimentalDecorators: true`

## Установка

```bash
# Peer зависимости
npm install react react-dom redux react-redux redux-saga immutable

# Библиотека
npm install @iiiristram/sagun

# Рекомендуется
npm install typed-redux-saga
```

## Быстрый пример

```tsx
import { Service, operation, daemon, useService, Operation } from '@iiiristram/sagun';
import { call, delay } from 'typed-redux-saga';

// Определяем сервис
class UserService extends Service {
  toString() { return 'UserService'; }

  @operation
  @daemon()
  *fetchUser(id: string) {
    yield* delay(1000);
    return { id, name: 'Иван Петров' };
  }
}

// Используем в компоненте
function UserPage({ userId }) {
  const di = useDI();
  const service = di.createService(UserService);
  di.registerService(service);
  
  const { operationId } = useService(service);
  
  return (
    <Suspense fallback="Загрузка...">
      <Operation operationId={operationId}>
        {() => <UserProfile />}
      </Operation>
    </Suspense>
  );
}
```

## Следующие шаги

- [Начало работы](./getting-started) — настройка Sagun в вашем проекте
- [Основные концепции](./concepts/operations) — узнайте об операциях и сервисах
- [API Reference](./api/services) — подробная документация по API

