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
      <p>Loading: {operation.loading ? 'Да' : 'Нет'}</p>
      <p>Success: {operation.success ? 'Да' : 'Нет'}</p>
      <p>Error: {operation.error?.message}</p>
      <pre>{JSON.stringify(operation.result, null, 2)}</pre>
    </div>
  )}
</Operation>
```

## Vs useOperation

| | Operation | useOperation |
|-|-----------|--------------|
| Suspense | ✅ Встроенная поддержка | ❌ Ручная обработка |
| Error Boundary | ✅ Пробрасывает ошибки | ❌ Ручная обработка |
| Доступ к loading | ❌ Скрыт Suspense | ✅ Полный доступ |
| Гибкость | Декларативный | Императивный |

## См. также

- [useOperation](../hooks/use-operation) — хук подписки
- [useSaga](../hooks/use-saga) — запуск саги
- [AsyncOperation](../../concepts/operations) — структура операции

