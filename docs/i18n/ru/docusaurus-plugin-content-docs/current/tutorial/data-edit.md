import MultiFilePlayground from '@site/src/components/MultiFilePlayground';

# Редактирование данных

Ранее мы рассмотрели, как читать данные, но нам ещё нужно как-то реагировать на действия пользователя, чтобы изменять данные.

## Декоратор daemon

Давайте создадим ещё одну сущность — Заказ. Кроме того, что мы можем загрузить заказы, мы ещё можем создать новый заказ.

Для вызова методов сервиса вне саг воспользуемся декоратором [daemon](../api/decorators/daemon)

```ts
class OrderService extends Service {
    toString() {
        return "OrderService"
    }

    @operation
    *getOrders() {
        return yield* call(fetchOrders);
    }

    // Создает redux экшен для этого метода.
    // Это позволит нам вызывать его откуда захотим, а не только из useSaga
    @daemon()
    *addOrder() {
        const id = getNewId();
        yield* call(addOrder, {id, description: `Order ${id}`});
        // обновляем данные о заказах в store
        yield* call(this.getOrders);
    }
}
```

Давайте добавим в приложение наш сервис

```tsx
function App({children}) {
    const di = useDI();
    
    const userService = di.createService(UserService);
    di.registerService(userService)

    // highlight-start
    const orderService = di.createService(OrderService);
    di.registerService(orderService)

    const {operationId} = useService([userService, orderService]);
    // highlight-end

    return (...);
}
```

Теперь напишем интерфейс, который будет предоставлять управление заказами.

<MultiFilePlayground
  files={[
   {
        name: 'Orders.tsx',
        code: `
function Orders() {
    // получаем объект actions для вызова методов сервиса
    const {service, actions} = useServiceConsumer(OrderService);
    // инициируем первую загрузку данных на mount компонента
    useSaga({ id: 'fetch-orders', onLoad: service.getOrders});
    // т.к. нам нужны актуальные данные по заказам, а не только результат первой загрузки в useSaga,
    // подписываемся напрямую на результат метода сервиса.
    // Id любого метода помеченного декоратором operation можно получить через хелпер getId
    const {result, isLoading} = useOperation({operationId: getId(service.getOrders)});

    return (
        <div>
            <button style={{display: 'block'}} onClick={actions.addOrder}>Add order</button>
            {result && !isLoading ? (
                <div style={{display: 'grid'}}>
                    {result.map(order => <Order key={order.id} {...order} />)}
                </div>
            ) : 'Загрузка заказов'}
        </div>
    );
}
`.trim()
    },
    {
        name: 'UserService.ts',
        language: 'typescript',
        hidden: true,
        code: `
class UserService extends Service {
    toString() {
        return "UserService"
    }

    @operation
    *getUserInfo() {
        return yield* call(fetchUser);
    }
}`.trim()
    },
    {
        name: 'OrderService.ts',
        language: 'typescript',
        code: `
class OrderService extends Service {
    toString() {
        return "OrderService"
    }

    @operation
    *getOrders() {
        return yield* call(fetchOrders);
    }

    // Создает redux экшен для этого метода.
    // Это позволит нам вызывать его откуда захотим, а не только из useSaga
    @daemon()
    *addOrder() {
        const id = getNewId();
        yield* call(addOrder, {id, description: \`Order \${id}\`});
        // обновляем данные о заказах в store
        yield* call(this.getOrders);
    }
}
`.trim()
    },
    {
      name: 'App.tsx',
      language: 'tsx',
      code: `
function App({children}) {
    const di = useDI();
    
    const userService = di.createService(UserService);
    di.registerService(userService)
    const orderService = di.createService(OrderService);
    di.registerService(orderService)

    const {operationId} = useService([userService, orderService]);

    return (
        <Suspense fallback="Загрузка данных...">
            <Operation operationId={operationId}>
                {() => <>{children}</>}
            </Operation>
        </Suspense>
    );
}`.trim()
    },
    {
        name: "index.tsx",
        hidden: true,
        code: `
render(
    <App>
        <Orders />
    </App>
)
`.trim()
    }
  ]}
/>

:::warning

Не рекомендуется вызывать методы сервиса из других саг через `actions`, тк такой вызов не будет отменен при отмене родительской саги.

```ts
useSaga({ 
    onLoad: function * () {
        // не правильно, на unmount компонента onLoad будет отменен, а foo - нет
        actions.foo();
        // правильно
        yield call(service.foo)
    }
})
```

:::

:::tip

Поведение по умолчанию декоратора `daemon` — метод не будет вызван, пока не отработал текущий вызов (касается только вызова через actions). Это позволяет из коробки избегать избыточных срабатываний — лишние клики по кнопкам, множественные события скролла при пагинации и т. д. 


Это поведение можно поменять указав аргументы декоратора, подробнее читайте в [описании](../api/decorators/daemon).
:::

## Стратегии для операций

Можно заметить, что каждый раз, когда мы добавляем заказ, мы видим лоадер — это не очень приятный UX. К тому же мы делаем лишние запросы за списком заказов.
Давайте сделаем добавление заказа на клиентской стороне. 

Для этого можно написать стратегию обновления операции, которая может преобразовывать данные перед их записью в store. У стратегии очень простой контракт - она принимает на вход данные операции, и должна их вернуть в том же формате, включая тип результата операции.

```ts
// Заведем явный id для операций над списком заказов.
// Это позволит нам редактировать одни и те же данные в store разными методами.
const ORDERS_OPERATION_ID = 'orders'

// опишем стратегию, которая решает сразу две проблемы,
// - добавляет новые заказы к списку
// - по умолчанию каждый раз, когда выполняется асинхронная операция, её прошлый результат обнуляется;
//   мы же явно описали, чтобы на время загрузки возвращался прошлый результат, 
//   это позволяет избавиться от лоадера в UI
function* appendStrategy(next) {
    const prev = yield select(state => state.asyncOperations.get(next.id));
    return {
        ...next,
        result: prev?.result && next.result 
            ? [...prev.result, ...next.result] 
            : next.result || prev?.result,
    };
}

class OrderService extends Service {
    // пометим все методы, которые будут редактировать список нашим id
    // highlight-next-line
    @operation(ORDERS_OPERATION_ID)
    *getOrders() { ... }

    @daemon()
    // highlight-start
    @operation({
        id: ORDERS_OPERATION_ID
        updateStrategy: appendStrategy
    })
    // highlight-end
    *addOrder() {
        const id = getNewId();
        const order = {id, description: `Order ${id}`};

        yield* call(addOrder, order);
        // возвращаем созданный заказ, чтобы можно было его добавить к списку
        // highlight-next-line
        return [order];
    }
}
```

:::tip

Можно написать множество переиспользуемых стратегий для типовых кейсов - добавление/удаление из списка, 
разного рода слияние данных и т. д.

Это позволяет сделать методы сервиса более легкими и читаемыми, и декларативно описать, как результат их исполнения будет обрабатываться.

:::

Проверим наше решение

<MultiFilePlayground
  files={[
   {
        name: 'Orders.tsx',
        code: `
function Orders() {
    const {service, actions} = useServiceConsumer(OrderService);
    useSaga({ id: 'fetch-orders', onLoad: service.getOrders});
    const {result, isLoading} = useOperation({operationId: getId(service.getOrders)});

    return (
        <div>
            <button style={{display: 'block'}} onClick={actions.addOrder}>Add order</button>
            {result ? (
                <div style={{display: 'grid'}}>
                    {result.map(order => <Order key={order.id} {...order} />)}
                </div>
            ) : 'Загрузка заказов...'}
        </div>
    );
}
`.trim()
    },
    {
        name: 'UserService.ts',
        language: 'typescript',
        hidden: true,
        code: `
class UserService extends Service {
    toString() {
        return "UserService"
    }

    @operation
    *getUserInfo() {
        return yield* call(fetchUser);
    }
}`.trim()
    },
    {
        name: 'OrderService.ts',
        language: 'typescript',
        code: `
const ORDERS_OPERATION_ID = 'orders'

class OrderService extends Service {
    toString() {
        return "OrderService"
    }

    @operation(ORDERS_OPERATION_ID)
    *getOrders() {
        return yield* call(fetchOrders);
    }

    @daemon()
    @operation({
        id: ORDERS_OPERATION_ID,
        updateStrategy: function* appendStrategy(next) {
            const prev = yield select(state => state.asyncOperations.get(next.id));
            return {
                ...next,
                result: prev?.result && next.result ? [...prev.result, ...next.result] : next.result || prev?.result,
            };
        }
    })
    *addOrder() {
        const id = getNewId();
        const order = {id, description: \`Order \${id}\`};

        yield* call(addOrderV2, order);
        return [order];
    }
}
`.trim()
    },
    {
      name: 'App.tsx',
      language: 'tsx',
      code: `
function App({children}) {
    const di = useDI();
    di.unregisterService(UserService)
    const userService = di.createService(UserService);
    di.registerService(userService)

    di.unregisterService(OrderService)
    const orderService = di.createService(OrderService);
    di.registerService(orderService)

    const {operationId} = useService([userService, orderService]);

    return (
        <Suspense fallback="Загрузка данных...">
            <Operation operationId={operationId}>
                {() => <>{children}</>}
            </Operation>
        </Suspense>
    );
}`.trim()
    },
    {
        name: "index.tsx",
        hidden: true,
        code: `
render(
    <App>
        <Orders />
    </App>
)
`.trim()
    }
  ]}
/>