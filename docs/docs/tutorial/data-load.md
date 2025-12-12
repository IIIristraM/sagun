# Loading Data

To load data in the simplest case, you can use the [useSaga](../api/hooks/use-saga) hook. It works similarly to `useEffect` — the `onLoad` function executes on component mount and when the arguments passed to the hook change.

The hook returns an [async operation](../concepts/operations) ID, which you can use to subscribe to its current state, for example by passing it to the [Operation](../api/components/operation) component or the [useOperation](../api/hooks/use-operation) hook.

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
