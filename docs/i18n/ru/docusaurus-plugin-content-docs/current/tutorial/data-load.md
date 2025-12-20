import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Загрузка данных

Для того, чтобы загрузить данные, в простейшем случае можно воспользоваться хуком [useSaga](../api/hooks/use-saga), он работает очень похоже на `useEffect`, функция `onLoad` отрабатывает на `mount` компонента, а также при изменении аргументов передаваемых в хук.

Хук возвращает ID [асинхронной операции](../concepts/operations), по которому в дальнейшем можно подписаться на ее актуальное состояние, например, передав его в компонент [Operation](../api/components/operation) или в хук [useOperation](../api/hooks/use-operation).

<Tabs>
<TabItem value="operation" label="Operation component" default>

    ```tsx live

    function App() {
        const { operationId } = useSaga({
            id: "fetch-user",
            // выполнится на mount компонента
            onLoad: function * () {
                return yield* call(fetchUser)
            }
        }, []);

        return (
            <Suspense fallback="Загрузка данных...">
                <Operation operationId={operationId}>
                    {(operation) => <div>Hello, {operation.result?.login}</div>}
                </Operation>
            </Suspense>
        );
    }
    ```
    
</TabItem>
<TabItem value="useOperation" label="useOperation">

    ```tsx live
    function App() {
        const { operationId } = useSaga({
            id: "fetch-user",
            // выполнится на mount компонента
            onLoad: function * () {
                return yield* call(fetchUser)
            }
        }, []);

        // при ожидании результата можно ориентироваться на флаг isLoading вместо Suspense
        const {result, isLoading} = useOperation({operationId})

        return isLoading ? "Загрузка данных..." : <div>Hello, {result?.login}</div>;
    }
    ```

</TabItem>
<TabItem value="useOperation_suspense" label="useOperation + Suspense">

    ```tsx live noInline
    function App() {
        return (
            <Suspense fallback="Загрузка данных...">
                <User />
            </Suspense>
        );
    }

    function User() {
        const { operationId } = useSaga({
            id: "fetch-user",
            // выполнится на mount компонента
            onLoad: function * () {
                return yield* call(fetchUser)
            }
        }, []);

        // совместимость с Suspense нужно явно включить, через опцию suspense 
        const {result} = useOperation({operationId, suspense: true})

        return <div>Hello, {result?.login}</div>
    }

    render(<App />)
    ```

</TabItem>
</Tabs>

:::tip

Рекомендуется использовать один хук `useSaga` на компонент, в котором можно описать все необходимые запросы, явно управляя тем, что запрашивать последовательно, что параллельно и т.д.

Использование множества хуков, которые работают независимо, делает загрузку данных менее предсказуемой.

:::

