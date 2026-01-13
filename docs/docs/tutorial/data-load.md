import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Loading Data

To load data in the simplest case, you can use the [useSaga](../api/hooks/use-saga) hook. It works similarly to `useEffect` — the `onLoad` function executes on component mount and when the arguments passed to the hook change.

The hook returns an [async operation](../concepts/operations) ID, which you can use to subscribe to its current state, for example by passing it to the [Operation](../api/components/operation) component or the [useOperation](../api/hooks/use-operation) hook.

<Tabs>
<TabItem value="operation" label="Operation component" default>

    ```tsx live

    function App() {
        const { operationId } = useSaga({
            id: "fetch-user",
            // executes on component mount
            onLoad: function * () {
                return yield* call(fetchUser)
            }
        }, []);

        return (
            <Suspense fallback="Loading data...">
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
            // executes on component mount
            onLoad: function * () {
                return yield* call(fetchUser)
            }
        }, []);

        // when waiting for result, you can use isLoading flag instead of Suspense
        const {result, isLoading} = useOperation({operationId})

        return isLoading ? "Loading data..." : <div>Hello, {result?.login}</div>;
    }
    ```

</TabItem>
<TabItem value="useOperation_suspense" label="useOperation + Suspense">

    ```tsx live noInline
    function App() {
        return (
            <Suspense fallback="Loading data...">
                <User />
            </Suspense>
        );
    }

    function User() {
        const { operationId } = useSaga({
            id: "fetch-user",
            // executes on component mount
            onLoad: function * () {
                return yield* call(fetchUser)
            }
        }, []);

        // Suspense compatibility must be explicitly enabled via suspense option 
        const {result} = useOperation({operationId, suspense: true})

        return <div>Hello, {result?.login}</div>
    }

    render(<App />)
    ```

</TabItem>
</Tabs>

:::tip

It's recommended to use one `useSaga` hook per component, where you can describe all necessary requests, explicitly controlling what to request sequentially, what in parallel, etc.

Using multiple hooks that work independently makes data loading less predictable.

:::
