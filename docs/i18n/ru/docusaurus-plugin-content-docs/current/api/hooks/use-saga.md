# useSaga

Запускает сагу, привязанную к жизненному циклу компонента.

## Сигнатура

```typescript
function useSaga<TRes, TArgs extends any[]>(
  saga: {
    id: string;
    onLoad?: (...args: TArgs) => Generator<any, TRes>;
    onDispose?: (...args: TArgs) => Generator<any, void>;
  },
  args: TArgs,
  options?: {
    operationOptions?: {
      updateStrategy: (operation: AsyncOperation) => AsyncOperation;
    };
  }
): {
  operationId: OperationId<TRes, TArgs>;
  reload: () => void;
};
```

## Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `saga.id` | `string` | **Обязательный** ID операции (должен быть уникальным для каждого экземпляра компонента) |
| `saga.onLoad` | `Saga?` | Сага, выполняемая на mount и при изменении args |
| `saga.onDispose` | `Saga?` | Сага очистки, выполняемая перед повторным onLoad или unmount |
| `args` | `TArgs` | Массив зависимостей (как в useEffect) |
| `options.operationOptions.updateStrategy` | `function?` | Функция для модификации операции перед сохранением |

## Возвращаемое значение

| Поле | Тип | Описание |
|------|-----|----------|
| `operationId` | `OperationId` | ID для подписки через useOperation или Operation |
| `reload` | `() => void` | Функция для принудительного перезапуска саги |

## Описание

`useSaga` — это основной способ запуска асинхронной логики в компонентах:

1. **На mount** — выполняется `onLoad`
2. **При изменении args** — текущий `onLoad` отменяется, выполняется `onDispose`, затем новый `onLoad`
3. **На unmount** — `onLoad` отменяется, выполняется `onDispose`

## Базовый пример

```tsx
import { useSaga, Operation } from '@iiiristram/sagun';
import { call } from 'typed-redux-saga';

function UserProfile({ userId }) {
  const { operationId } = useSaga({
    id: `user-profile-${userId}`,
    onLoad: function* () {
      return yield* call(api.getUser, userId);
    }
  }, [userId]);

  return (
    <Suspense fallback={<Spinner />}>
      <Operation operationId={operationId}>
        {(op) => <div>{op.result?.name}</div>}
      </Operation>
    </Suspense>
  );
}
```

## С очисткой

```tsx
function LiveData({ streamId }) {
  const { operationId } = useSaga({
    id: `live-data-${streamId}`,
    onLoad: function* () {
      const subscription = yield* call(api.subscribe, streamId);
      return subscription;
    },
    onDispose: function* () {
      yield* call(api.unsubscribe, streamId);
    }
  }, [streamId]);

  return (
    <Operation operationId={operationId}>
      {(op) => <DataView data={op.result} />}
    </Operation>
  );
}
```

## С принудительной перезагрузкой

```tsx
function DataWithRefresh({ id }) {
  const { operationId, reload } = useSaga({
    id: `data-${id}`,
    onLoad: function* () {
      return yield* call(api.getData, id);
    }
  }, [id]);

  return (
    <div>
      <button onClick={reload}>Обновить</button>
      <Operation operationId={operationId}>
        {(op) => <div>{op.result}</div>}
      </Operation>
    </div>
  );
}
```

## С updateStrategy

Используйте `updateStrategy` для модификации операции перед сохранением (например, для пагинации):

```tsx
import { select } from 'typed-redux-saga';

function PaginatedList({ page }) {
  const { operationId } = useSaga({
    id: 'paginated-list',
    onLoad: function* (pageNum) {
      return yield* call(api.getItems, pageNum);
    }
  }, [page], {
    operationOptions: {
      updateStrategy: function* (next) {
        // Получить предыдущее состояние
        const prev = yield* select(state => 
          state.asyncOperations.get(next.id)
        );
        
        // Объединить результаты
        return {
          ...next,
          result: prev?.result && next.result 
            ? [...prev.result, ...next.result] 
            : next.result || prev?.result,
        };
      }
    }
  });

  return (
    <Operation operationId={operationId}>
      {(op) => <ItemList items={op.result} />}
    </Operation>
  );
}
```

## Важно

- `id` **обязателен** — должен быть уникальным для каждого экземпляра компонента (например, `item-${id}` для элементов списка)
- `onLoad` **отменяется** при изменении args или unmount
- `onDispose` **выполняется до конца** (не отменяется)
- Используйте `try/finally` в `onLoad` для гарантированной очистки при отмене

:::note Почему id обязателен?
Начиная с React v18, поведение Suspense изменилось — React может сбрасывать состояние компонента.
Стабильный `id` необходим для корректной работы. См. [React issue #24669](https://github.com/facebook/react/issues/24669).
:::

## useSagaUnsafe (deprecated)

Для обратной совместимости доступен `useSagaUnsafe`, где `id` опционален:

```tsx
import { useSagaUnsafe } from '@iiiristram/sagun';

// id опционален, но не рекомендуется для новых компонентов
const { operationId } = useSagaUnsafe({
  onLoad: function* () {
    return yield* call(api.getData);
  }
}, []);
```

:::warning
`useSagaUnsafe` помечен как deprecated. Используйте `useSaga` с обязательным `id`.
:::

## См. также

- [useOperation](./use-operation) — подписка на операцию
- [Operation](../components/operation) — компонент отображения
- [useService](./use-service) — для сложной логики используйте сервисы

