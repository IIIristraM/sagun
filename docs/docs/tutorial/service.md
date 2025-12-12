# Создание сервиса

Писать бизнес-логику в хуках не очень хорошая практика, лучше вынести ее в отдельный UI-агностик слой, для этого во фреймворке существует абстракция [сервисов](../concepts/services.md).

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
                    {(operation) => <div>Hello, {operation.result.login}</div>}
                </Operation>
            </Suspense>
        );
    }
    ```