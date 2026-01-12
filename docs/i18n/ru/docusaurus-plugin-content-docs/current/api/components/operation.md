# Operation

Компонент для отображения состояния операции с поддержкой Suspense.

## Сигнатура

```tsx
function Operation<TResult>(props: {
  operationId: string;
  children: (operation: AsyncOperation<TResult>) => ReactNode;
}): JSX.Element;
```

## Props

| Prop | Тип | Описание |
|------|-----|----------|
| `operationId` | `string` | ID операции |
| `children` | `Function` | Render-функция, получающая состояние операции |

## Описание

`Operation` — это компонент, который:

1. **Подписывается на операцию** — аналогично `useOperation`
2. **Интегрируется с Suspense** — выбрасывает Promise пока операция загружается
3. **Пробрасывает ошибки** — можно ловить через Error Boundary

## Базовый пример

```tsx
import { useSaga, Operation } from '@iiiristram/sagun';
import { Suspense } from 'react';

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
        {(operation) => (
          <div>
            <h1>{operation.result?.name}</h1>
            <p>{operation.result?.email}</p>
          </div>
        )}
      </Operation>
    </Suspense>
  );
}
```

## С Error Boundary

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function App() {
  const { operationId } = useSaga({
    id: 'app-data',
    onLoad: function* () {
      return yield* call(api.getData);
    }
  }, []);

  return (
    <ErrorBoundary fallback={<ErrorMessage />}>
      <Suspense fallback={<Spinner />}>
        <Operation operationId={operationId}>
          {(op) => <DataView data={op.result} />}
        </Operation>
      </Suspense>
    </ErrorBoundary>
  );
}
```

## Вложенные операции

```tsx
function ProductPage({ productId }) {
  const { operationId: productOpId } = useSaga({
    id: `product-${productId}`,
    onLoad: function* () {
      return yield* call(api.getProduct, productId);
    }
  }, [productId]);

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Operation operationId={productOpId}>
        {(productOp) => (
          <>
            <ProductDetails product={productOp.result} />
            <RelatedProducts productId={productId} />
          </>
        )}
      </Operation>
    </Suspense>
  );
}

function RelatedProducts({ productId }) {
  const { operationId } = useSaga({
    id: `related-${productId}`,
    onLoad: function* () {
      return yield* call(api.getRelated, productId);
    }
  }, [productId]);

  return (
    <Suspense fallback={<ListSkeleton />}>
      <Operation operationId={operationId}>
        {(op) => <ProductList products={op.result} />}
      </Operation>
    </Suspense>
  );
}
```

## Доступ к полному состоянию

```tsx
<Operation operationId={operationId}>
  {(operation) => (
    <div>
      {/* Доступны все поля AsyncOperation */}
      <p>Загрузка: {operation.isLoading ? 'Да' : 'Нет'}</p>
      <p>Ошибка: {operation.isError ? 'Да' : 'Нет'}</p>
      <p>Сообщение ошибки: {operation.error?.message}</p>
      <pre>{JSON.stringify(operation.result, null, 2)}</pre>
    </div>
  )}
</Operation>
```

## Vs useOperation

| | Operation | useOperation |
|-|-----------|--------------|
| Suspense | ✅ Встроенная поддержка | ✅ Через опцию `suspense: true` |
| Error Boundary | ✅ Пробрасывает ошибки | ✅ Через опцию `suspense: true` |
| Доступ к isLoading | ❌ Скрыт Suspense | ✅ Полный доступ |
| Гибкость | Декларативный | Императивный |

## См. также

- [useOperation](../hooks/use-operation) — хук подписки
- [useSaga](../hooks/use-saga) — запуск саги
- [AsyncOperation](../../concepts/operations) — структура операции

