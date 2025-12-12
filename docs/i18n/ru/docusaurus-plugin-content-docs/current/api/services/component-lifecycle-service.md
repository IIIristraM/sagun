# ComponentLifecycleService

Управляет жизненным циклом саг компонентов для хуков `useSaga` и `useService`.

## Определение

```typescript
class ComponentLifecycleService extends Service {
  scheduleExecution<TArgs>(options: LoadOptions<TArgs, any>): void;
  getCurrentExecution(operationId: string): LoadOptions | undefined;
}
```

## Методы

| Метод | Описание |
|-------|----------|
| `load(operationId)` | Запустить цикл загрузки (внутренний демон) |
| `cleanup({ operationId })` | Очистка при размонтировании (внутренний демон) |
| `scheduleExecution(options)` | Запланировать следующее выполнение |
| `getCurrentExecution(id)` | Получить текущее состояние выполнения |

## Описание

`ComponentLifecycleService` обрабатывает жизненный цикл саг, привязанных к React компонентам. Он:

- Управляет циклом `onLoad`/`onDispose` для `useSaga`
- Обрабатывает отмену при изменении аргументов
- Гарантирует завершение `onDispose` перед следующим `onLoad`
- Координируется с `OperationService` для очистки

## Настройка

```typescript
import { OperationService, ComponentLifecycleService, Root } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

const operationService = new OperationService();
const componentLifecycleService = new ComponentLifecycleService(operationService);

sagaMiddleware.run(function* () {
  yield* call(operationService.run);
  yield* call(componentLifecycleService.run);
});

// Передать в приложение
<Root 
  operationService={operationService}
  componentLifecycleService={componentLifecycleService}
>
  <App />
</Root>
```

## Поток жизненного цикла

Когда вызывается `useSaga`:

1. Вызывается `scheduleExecution()` с конфигом саги
2. Демон `load()` подхватывает выполнение
3. Выполняется сага `onLoad`
4. Если args изменились или компонент размонтирован:
   - Текущий `onLoad` отменяется
   - `onDispose` выполняется до конца
   - Запускается новый `onLoad` (если args изменились)
5. При размонтировании `cleanup()` удаляет операцию

## Внутреннее использование

Этот сервис используется внутри:

- Хуком `useSaga`
- Хуком `useService`

Обычно вы не взаимодействуете с ним напрямую.

## См. также

- [OperationService](./operation-service) — управление операциями
- [useSaga](../hooks/use-saga) — хук саги
- [useService](../hooks/use-service) — хук сервиса

