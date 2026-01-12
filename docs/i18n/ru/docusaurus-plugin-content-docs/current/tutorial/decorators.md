# Собственные декораторы

import MultiFilePlayground from '@site/src/components/MultiFilePlayground';

В предыдущих главах мы использовали встроенные декораторы `@operation` и `@daemon` для расширения функциональности методов сервиса. Но что если нам нужна кастомная логика, которая будет применяться к множеству методов? В этом случае мы можем создать собственные декораторы.

## Настройка TypeScript

:::warning Важно
Sagun использует **legacy-версию декораторов** TypeScript (Stage 2), а не новый стандарт декораторов из ECMAScript. Это связано с тем, что новый стандарт не предусматривает декорирование аргументов, что необходимо для реализации DI
:::

Для работы декораторов убедитесь, что в вашем `tsconfig.json` включена опция `experimentalDecorators`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

## Преимущества декораторов

Декораторы предоставляют мощный механизм для расширения функциональности без изменения исходного кода методов:

- **Переиспользуемость** — один раз написанный декоратор можно применить к любому количеству методов
- **Декларативность** — логика расширения явно указана над методом, что улучшает читаемость кода  
- **Разделение ответственности** — основная логика метода остается чистой, а дополнительная функциональность вынесена в декоратор
- **Композиция** — декораторы можно комбинировать, наращивая функциональность слоями

## Создание своего декоратора

Рассмотрим практический пример — создадим декоратор `@log`, который будет логировать вызовы методов в консоль.

```ts
function log(target: any, key: string, descriptor: PropertyDescriptor) {
    const origin = descriptor.value;

    // Оборачиваем оригинальный метод
    function* logged(...args: any[]) {
        console.log(`▶ [${target.toString()}] ${key} вызван с аргументами:`, args);
        
        try {
            // Вызываем оригинальный метод с сохранением контекста
            const result = yield* call([this, origin], ...args);
            console.log(`✓ [${target.toString()}] ${key} вернул:`, result);
            return result;
        } catch (error) {
            console.error(`✗ [${target.toString()}] ${key} ошибка:`, error);
            throw error;
        }
    }

    // Сохраняем свойства оригинального метода (например, id операции)
    descriptor.value = Object.assign(logged, origin);
    return descriptor;
}
```

Теперь применим наш декоратор к сервису из предыдущих примеров:

```ts
class OrderService extends Service {
    toString() {
        return "OrderService"
    }

    @log
    @operation
    *getOrders() {
        return yield* call(fetchOrders);
    }

    @log
    @daemon()
    *addOrder() {
        const id = getNewId();
        yield* call(addOrder, {id, description: `Order ${id}`});
        yield* call(this.getOrders);
    }
}
```

Полный пример

Откройте консоль браузера (F12 → Console), чтобы увидеть логи вызовов методов.

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
            <p style={{color: '#888', fontSize: 12}}>
                Откройте консоль браузера (F12), чтобы увидеть логи
            </p>
            <button style={{display: 'block', marginBottom: 8}} onClick={actions.addOrder}>
                Добавить заказ
            </button>
            {result && !isLoading ? (
                <div style={{display: 'grid', gap: 4}}>
                    {result.map(order => <Order key={order.id} {...order} />)}
                </div>
            ) : 'Загрузка заказов...'}
        </div>
    );
}
`.trim()
    },
    {
        name: 'decorators.ts',
        language: 'typescript',
        code: `
// Декоратор для логирования вызовов методов
function log(target: any, key: string, descriptor: PropertyDescriptor) {
    const origin = descriptor.value;

    function* logged(...args: any[]) {
        console.log(\`▶ [\${target.toString()}] \${key} вызван с аргументами:\`, args);
        
        try {
            const result = yield* call([this, origin], ...args);
            console.log(\`✓ [\${target.toString()}] \${key} вернул:\`, result);
            return result;
        } catch (error) {
            console.error(\`✗ [\${target.toString()}] \${key} ошибка:\`, error);
            throw error;
        }
    }

    descriptor.value = Object.assign(logged, origin);
    return descriptor;
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

    // Применяем @log для логирования вызовов
    @log
    @operation
    *getOrders() {
        return yield* call(fetchOrders);
    }

    @log
    @daemon()
    *addOrder() {
        const id = getNewId();
        yield* call(addOrder, {id, description: \`Order \${id}\`});
        yield* call(this.getOrders);
    }
}`.trim()
    },
    {
      name: 'App.tsx',
      language: 'tsx',
      code: `
function App({children}) {
    const di = useDI();
    
    di.unregisterService(OrderService)
    const orderService = di.createService(OrderService);
    di.registerService(orderService)

    const {operationId} = useService(orderService);

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

## Порядок декораторов

Декораторы в TypeScript применяются **снизу вверх** — сначала применяется самый нижний декоратор, затем его оборачивает следующий и так далее. Это важно понимать при композиции нескольких декораторов.

Рассмотрим это на примере двух декораторов: `@log` и `@catch`. Декоратор `@catch` перехватывает ошибки и возвращает fallback-значение вместо выброса исключения:

```ts
function errorHandler(fallback: any) {
    return function(target: any, key: string, descriptor: PropertyDescriptor) {
        const origin = descriptor.value;

        function* caught(...args: any[]) {
            try {
                return yield* call([this, origin], ...args);
            } catch (error) {
                console.warn(`[${key}] ошибка перехвачена, возвращаем fallback`);
                return fallback;
            }
        }

        descriptor.value = Object.assign(caught, origin);
        return descriptor;
    };
}
```

#### Вариант 1: @log выше @errorHandler

```ts
@log
@errorHandler([])
@operation
*getOrders() { ... }
```

Порядок применения (снизу вверх): `operation` → `errorHandler` → `log`

В этом случае `@log` оборачивает `@catch`, поэтому:
- Если метод выбросит ошибку, `@catch` её перехватит
- `@log` увидит успешный результат (fallback-значение)
- **Ошибка НЕ будет залогирована**

#### Вариант 2: @catch выше @log

```ts
@errorHandler([])
@log
@operation
*getOrders() { ... }
```

Порядок применения (снизу вверх): `operation` → `log` → `errorHandler`

В этом случае `@catch` оборачивает `@log`, поэтому:
- Если метод выбросит ошибку, `@log` её увидит и залогирует
- Затем ошибка "всплывёт" к `@catch`, который её перехватит
- **Ошибка БУДЕТ залогирована**

#### Интерактивный пример

Попробуйте изменить порядок декораторов `@log` и `@errorHandler` в файле `OrderService.ts` и нажмите кнопку "Сломать загрузку". Обратите внимание на консоль — в одном случае ошибка логируется, в другом нет.

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
            <p style={{color: '#888', fontSize: 12}}>
                Откройте консоль браузера (F12) и попробуйте поменять порядок @log и @errorHandler
            </p>
            <button 
                style={{display: 'block', marginBottom: 8}} 
                onClick={actions.breakAndReload}
            >
                Сломать загрузку
            </button>
            {result && !isLoading ? (
                <div style={{display: 'grid', gap: 4}}>
                    {result.map(order => <Order key={order.id} {...order} />)}
                </div>
            ) : 'Загрузка заказов...'}
        </div>
    );
}
`.trim()
    },
    {
        name: 'decorators.ts',
        language: 'typescript',
        code: `
// Логирует вызов метода и его результат/ошибку
function log(target: any, key: string, descriptor: PropertyDescriptor) {
    const origin = descriptor.value;

    function* logged(...args: any[]) {
        console.log(\`▶ [\${target.toString()}] \${key} вызван\`);
        
        try {
            const result = yield* call([this, origin], ...args);
            console.log(\`✓ [\${target.toString()}] \${key} успех\`);
            return result;
        } catch (error) {
            console.error(\`✗ [\${target.toString()}] \${key} ОШИБКА:\`, error.message);
            throw error;
        }
    }

    descriptor.value = Object.assign(logged, origin);
    return descriptor;
}

// Перехватывает ошибки и возвращает fallback-значение
function errorHandler(fallback: any) {
    return function(target: any, key: string, descriptor: PropertyDescriptor) {
        const origin = descriptor.value;

        function* caught(...args: any[]) {
            try {
                return yield* call([this, origin], ...args);
            } catch (error) {
                console.warn(\`🛡 [\${key}] ошибка перехвачена, возвращаем fallback\`);
                return fallback;
            }
        }

        descriptor.value = Object.assign(caught, origin);
        return descriptor;
    };
}`.trim()
    },
    {
        name: 'OrderService.ts',
        language: 'typescript',
        code: `
let shouldFail = false;

class OrderService extends Service {
    toString() {
        return "OrderService"
    }

    // Попробуйте поменять местами @log и @errorHandler
    // Сейчас: @log выше @errorHandler — ошибка НЕ логируется
    @log
    @errorHandler([])
    @operation
    *getOrders() {
        if (shouldFail) {
            shouldFail = false;
            throw new Error('Упс! Сервер недоступен');
        }
        return yield* call(fetchOrders);
    }

    @daemon()
    *breakAndReload() {
        shouldFail = true;
        yield* call(this.getOrders);
    }
}`.trim()
    },
    {
      name: 'App.tsx',
      language: 'tsx',
      code: `
function App({children}) {
    const di = useDI();
    
    di.unregisterService(OrderService)
    const orderService = di.createService(OrderService);
    di.registerService(orderService)

    const {operationId} = useService(orderService);

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

:::tip

С помощью порядка декораторов можно очень гибко настраивать поведение методов просто меняя строки местами - что логировать, какие ошибки всплывают, валидации и т.д.

:::