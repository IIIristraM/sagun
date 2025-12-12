# useSaga

Запускает сагу, привязанную к жизненному циклу компонента.

## Сигнатура

```typescript
function useSaga<TResult, TArgs extends any[]>(
  options: {
    id?: string;
    onLoad: (...args: TArgs) => Generator<any, TResult>;
    onDispose?: () => Generator<any, void>;
    ssr?: boolean;
  },
  args: TArgs
): { operationId: string };
```

## Параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `options.id` | `string?` | Пользовательский ID операции (автогенерируется если не указан) |
| `options.onLoad` | `Generator` | Сага, выполняемая на mount и при изменении args |
| `options.onDispose` | `Generator?` | Сага очистки, выполняемая перед повторным onLoad или unmount |
| `options.ssr` | `boolean?` | Включить SSR (не перезапускать на клиенте если есть данные) |
| `args` | `any[]` | Массив зависимостей (как в useEffect) |

## Возвращаемое значение

| Поле | Тип | Описание |
|------|-----|----------|
| `operationId` | `string` | ID для подписки через useOperation или Operation |

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
    onLoad: function* () {
      const subscription = yield* call(api.subscribe, streamId);
      return subscription;
    },
    onDispose: function* () {
      yield* call(api.unsubscribe, streamId);
    }
  }, [streamId]);

  return <Operation operationId={operationId}>
    {(op) => <DataView data={op.result} />}
  </Operation>;
}
```

## С пользовательским ID

```tsx
function Product({ productId }) {
  // Пользовательский ID для доступа из других компонентов
  const { operationId } = useSaga({
    id: `product-${productId}`,
    onLoad: function* () {
      return yield* call(api.getProduct, productId);
    }
  }, [productId]);

  // operationId === `product-${productId}`
}
```

## С SSR

```tsx
function ServerRenderedData({ id }) {
  const { operationId } = useSaga({
    ssr: true, // Не перезапускать на клиенте если данные есть
    onLoad: function* () {
      return yield* call(api.getData, id);
    }
  }, [id]);

  return <Operation operationId={operationId}>
    {(op) => <div>{op.result}</div>}
  </Operation>;
}
```

## Важно

- `onLoad` **отменяется** при изменении args или unmount
- `onDispose` **выполняется до конца** (не отменяется)
- Используйте `try/finally` в `onLoad` для гарантированной очистки при отмене

## См. также

- [useOperation](./use-operation) — подписка на операцию
- [Operation](../components/operation) — компонент отображения
- [useService](./use-service) — для сложной логики используйте сервисы

