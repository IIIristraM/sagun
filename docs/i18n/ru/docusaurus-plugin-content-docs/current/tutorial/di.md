import MultiFilePlayground from '@site/src/components/MultiFilePlayground';

# Dependency injection

Сущности в доменной области, как правило, имеют взаимосвязи, и для того чтобы описать какой-либо пользовательский сценарий, требуется оперировать несколькими сущностями, для решения этой задачи во фреймворке есть встроенный DI контейнер, который позволяет декларативно описывать и резолвить зависимости между сервисами.

## Зависимости от сервисов

В нашем приложении уже есть сущности пользователя и заказов, давайте представим, что при покупке пользователю начисляются бонусы, и мы хотим после покупки обновить информацию о его текущем количестве бонусов.

Добавим в сервис пользователя соответствующий метод

```ts
class UserService extends Service {
    @operation
    *getBonuses() {
        return yield* call(fetchBonuses);
    }
}
```

Теперь нам нужно обновить информацию о бонусах после свершения заказа, но эта логика находится в разных сервисах, давайте укажем, что OrderService зависит от UserService. Для этого воспользуемся декоратором [inject](../api/decorators/inject).

```ts
class OrderService extends Service {
    // highlight-start
    #userService: UserService

    constructor(
        @inject(OperationService) operationService: OperationService,
        @inject(UserService) userService: UserService
    ) {
        // обязательная инициализация базового класса
        super(operationService)
        this.#userService = userService;
    }
    // highlight-end

    @daemon()
    @operation({
        id: ORDERS_OPERATION_ID,
        updateStrategy: appendStrategy
    })
    *addOrder() {
        const id = getNewId();
        const order = {id, description: `Order ${id}`};

        yield* call(addOrder, order);
        // обновляем информацию о бонусах
        // highlight-next-line
        yield* call(this.#userService.getBonuses);
        return [order];
    }
}
```
Теперь давайте доработаем интерфейс

<MultiFilePlayground
  files={[
    {
        name: 'Orders.tsx',
        code: `
function Orders() {
    const {service: orderService, actions} = useServiceConsumer(OrderService);
    const {service: userService} = useServiceConsumer(UserService);

    useSaga({ id: 'fetch-orders', onLoad: function * () {
        yield* all([
            call(orderService.getOrders),
            call(userService.getBonuses)
        ])
    }});

    const {result, isLoading} = useOperation({operationId: getId(orderService.getOrders)});
    const {result: bonuses} = useOperation({operationId: getId(userService.getBonuses)});

    return (
        <div>
            <div>Bonuses: {bonuses?.count ?? 'Processing...'}</div>
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
        code: `
class UserService extends Service {
    toString() {
        return "UserService"
    }

    @operation
    *getUserInfo() {
        return yield* call(fetchUser);
    }

    @operation
    *getBonuses() {
        return yield* call(fetchBonuses);
    }
}`.trim()
    },
    {
        name: 'OrderService.ts',
        language: 'typescript',
        code: `
const ORDERS_OPERATION_ID = 'orders' as OperationId<Order[]>

class OrderService extends Service {
    #userService: UserService;

    constructor(
        @inject(OperationService) operationService: OperationService,
        @inject(UserService) userService: UserService
    ) {
        super(operationService)
        this.#userService = userService;
    }

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
        yield* call(this.#userService.getBonuses);
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

:::info

Зависимости нужно регистрировать в том порядке в котором их надо резолвить. 
В нашем примере зависимость `UserService => OrderService`, в этом порядке их и регистрируем.

:::

## Зависимости от пользовательских классов

Кроме сервиса можно инъектировать любой класс, унаследовав его от базового класса [Dependency](../api/services/dependency). 

Давайте рассмотрим пример, когда это может быть полезно. В нашем приложении нам необходимо делать запросы к бекенду, сейчас это описано набором утилит `fetchUser`, `fetchOrders` и т.д. Такой подход не предоставляет никакого явного контракта, работу с бэкендом сложнее тестировать и настраивать — давайте это исправим.

Создадим для АПИ явный контракт в виде класса.

```ts
class API extends Dependency {
    toString() {
        return 'API'
    }

    fetchUser() {};
    fetchBonuses();
    fetchOrders() {};
    addOrder(order) {};
}
```

Зарегистрируем наш класс

```tsx
function App({children}) {
    const di = useDI();

    // highlight-next-line
    di.registerService(new API())   

    const userService = di.createService(UserService);
    di.registerService(userService)

    const orderService = di.createService(OrderService);
    di.registerService(orderService)

    return (...)
}
```

Тогда мы можем создать явную зависимость сервиса от API, это может выглядеть как на примере ниже

```ts
class UserService extends Service {
    #api: API;

    toString() {
        return "UserService"
    }

    constructor(
        @inject(OperationService) operationService: OperationService,
        @inject(API) api: API
    ) {
        super(operationService);
        this.#api = api;
    }

    @operation
    *getUserInfo() {
        return yield* call(this.#api.fetchUser);
    }

    @operation
    *getBonuses() {
        return yield* call(this.#api.fetchBonuses);
    }
}
```

Теперь у нашего API есть явный контракт, а наши сервисы гораздо проще тестировать, т. к. мы можем подставлять любую реализацию контракта для API.

Полный пример

<MultiFilePlayground
  files={[
    {
        name: 'Orders.tsx',
        code: `
function Orders() {
    const {service: orderService, actions} = useServiceConsumer(OrderService);
    const {service: userService} = useServiceConsumer(UserService);

    useSaga({ id: 'fetch-orders', onLoad: function * () {
        yield* all([
            call(orderService.getOrders),
            call(userService.getBonuses)
        ])
    }});

    const {result, isLoading} = useOperation({operationId: getId(orderService.getOrders)});
    const {result: bonuses} = useOperation({operationId: getId(userService.getBonuses)});

    return (
        <div>
            <div>Bonuses: {bonuses?.count ?? 'Processing...'}</div>
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
        code: `
class UserService extends Service {
    #api: API;

    toString() {
        return "UserService"
    }

    constructor(
        @inject(OperationService) operationService: OperationService,
        @inject(API) api: API
    ) {
        super(operationService);
        this.#api = api;
    }

    @operation
    *getUserInfo() {
        return yield* call(this.#api.fetchUser);
    }

    @operation
    *getBonuses() {
        return yield* call(this.#api.fetchBonuses);
    }
}`.trim()
    },
    {
        name: 'OrderService.ts',
        language: 'typescript',
        code: `
const ORDERS_OPERATION_ID = 'orders' as OperationId<Order[]>

class OrderService extends Service {
    #userService: UserService;
    #api: API;

    constructor(
        @inject(OperationService) operationService: OperationService,
        @inject(UserService) userService: UserService,
        @inject(API) api: API
    ) {
        super(operationService)
        this.#userService = userService;
        this.#api = api;
    }

    toString() {
        return "OrderService"
    }

    @operation(ORDERS_OPERATION_ID)
    *getOrders() {
        return yield* call(this.#api.fetchOrders);
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

        yield* call(this.#api.addOrderV2, order);
        yield* call(this.#userService.getBonuses);
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

    di.registerService(new API())   

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

## Зависимости по ключу

В качестве зависимости можно передавать не только экземпляры класса, в целом можно передать любое значение, зарегистрировав его по ключу.

Например, как правило у приложений есть некоторый контекст, который зависит от окружения, например содержит в какой домен бекенда ходить в тестинге, а в какой в продакшене.

В простейшем случае это может выглядеть так

```ts
// используем специальный тип DependencyKey, который содержит мета-информацию о зависимости
const APP_CONTEXT_KEY = 'APP_CONTEXT' as DependencyKey<AppContext>;

type AppContext = {
    env: string;
}

const appContext: AppContext = {
    env: "testing"
}
```

```ts
class API extends Dependency {
    #host: string;

    constructor(@inject(APP_CONTEXT_KEY) {env}: AppContext) {
        this.#host = env === "testing" ? "..." : "..."
    }
}
```

Мы можем сделать его доступным для нашего приложения, зарегистрировав его как зависимость по ключу.

```tsx
function App({children}) {
    const di = useDI();

    // highlight-start
    di.registerDependency(APP_CONTEXT_KEY, appContext);
    
    const api = di.createService(API);
    di.registerService(api);
    // highlight-end

    di.unregisterService(UserService)
    const userService = di.createService(UserService);
    di.registerService(userService)

    di.unregisterService(OrderService)
    const orderService = di.createService(OrderService);
    di.registerService(orderService)

    return (...);
}
```

В UI также можно читать значения любых зависимостей

```tsx
const di = useDI();
const appContext = di.getDependency(APP_CONTEXT_KEY);
```

Добавим вывод окружения в интерфейсе

<MultiFilePlayground
  files={[
    {
        name: 'Orders.tsx',
        code: `
function Orders() {
    const {service: orderService, actions} = useServiceConsumer(OrderService);
    const {service: userService} = useServiceConsumer(UserService);
    const di = useDI();
    const {env} = di.getDependency(APP_CONTEXT_KEY);

    useSaga({ id: 'fetch-orders', onLoad: function * () {
        yield* all([
            call(orderService.getOrders),
            call(userService.getBonuses)
        ])
    }});

    const {result, isLoading} = useOperation({operationId: getId(orderService.getOrders)});
    const {result: bonuses} = useOperation({operationId: getId(userService.getBonuses)});

    return (
        <div>
            <div>Env: {env}</div>
            <div>Bonuses: {bonuses?.count ?? 'Processing...'}</div>
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
    #api: API;

    toString() {
        return "UserService"
    }

    constructor(
        @inject(OperationService) operationService: OperationService,
        @inject(API) api: API
    ) {
        super(operationService);
        this.#api = api;
    }

    @operation
    *getUserInfo() {
        return yield* call(this.#api.fetchUser);
    }

    @operation
    *getBonuses() {
        return yield* call(this.#api.fetchBonuses);
    }
}`.trim()
    },
    {
        name: 'OrderService.ts',
        language: 'typescript',
        hidden: true,
        code: `
const ORDERS_OPERATION_ID = 'orders' as OperationId<Order[]>

class OrderService extends Service {
    #userService: UserService;
    #api: API;

    constructor(
        @inject(OperationService) operationService: OperationService,
        @inject(UserService) userService: UserService,
        @inject(API) api: API
    ) {
        super(operationService)
        this.#userService = userService;
        this.#api = api;
    }

    toString() {
        return "OrderService"
    }

    @operation(ORDERS_OPERATION_ID)
    *getOrders() {
        return yield* call(this.#api.fetchOrders);
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

        yield* call(this.#api.addOrderV2, order);
        yield* call(this.#userService.getBonuses);
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

    di.registerDependency(APP_CONTEXT_KEY, appContext);
    
    const api = di.createService(API);
    di.registerService(api);

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