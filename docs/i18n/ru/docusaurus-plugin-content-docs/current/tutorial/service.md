# Создание сервиса

import MultiFilePlayground from '@site/src/components/MultiFilePlayground';

Писать бизнес-логику в хуках не очень хорошая практика, которая ведет к размыванию границ между слоями приложения, усложняет расширение и тестирование кода. Лучше вынести логику в отдельный UI-агностик слой, для этого во фреймворке существует абстракция [сервисов](../concepts/services.md).

Сервис - это обычный класс, описывающий или часть предметной области, или часть логики приложения в сложных сценариях.

Создадим сервис для работы с сущностью пользователя

```ts
class UserService extends Service {
    // требуется для DI и генерации Redux actions
    toString() {
        return "UserService"
    }

    // Помечаем, что результат метода нужно хранить в store
    @operation
    *getUserInfo() {
        return yield* call(fetchUser);
    }
}
```

Теперь нужно однократно создать экземпляр сервиса и зарегистрировать его в DI контейнере, это можно сделать в любом компоненте, для примера сделаем это в корне приложения.

```tsx
function App({children}) {
    const di = useDI();
    
    // создаем и регистрируем сервис
    const userService = di.createService(UserService);
    di.registerService(userService)

    // инициализируем сервис (это асинхронный процесс в общем случае)
    const {operationId} = useService(userService);

    return (
        <Suspense fallback="Загрузка данных...">
            <Operation operationId={operationId}>
                {() => <>{children}</>}
            </Operation>
        </Suspense>
    );
}
```

:::tip

Рекомендуется регистрировать сервис в том компоненте, на уровне которого он требуется, например, если сервис нужен только на одной конкретной странице, то в ней и регистрировать.

Это связано с тем что во фреймворке есть [механизм управления памятью](../advanced/memory-cleanup), который работает тем эффективнее, чем ближе сервисы к тому дереву компонент, в котором они нужны.

:::

Теперь можем в любом компоненте использовать сервис

```tsx
function User() {
  const {service} = useServiceConsumer(UserService);

  const {operationId} = useSaga({
      id: 'fetch-user',
      onLoad: service.getUserInfo
  })

  const {result} = useOperation({operationId, suspense: true})

  return <div>Hello, {result?.login}</div>;
}
```

Мы написали заметное количество дополнительного кода, однако теперь наша логика работы с юзером описана, и может быть протестирована отдельно от React и жизненного цикла
компонент. В дальнейших шагах будет раскрываться все больше преимуществ такого подхода.

Полный пример

<MultiFilePlayground
  files={[
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
}`.trim()
    },
    {
      name: 'App.tsx',
      language: 'tsx',
      code: `function App({children}) {
    const di = useDI();

    // unregisterService требуется конкретно в live редакторе, чтобы работало обновление кода сервиса
    di.unregisterService(UserService)
    const userService = di.createService(UserService);
    di.registerService(userService)

    const {operationId} = useService(userService);

    return (
        <Suspense fallback="Загрузка данных...">
            <Operation operationId={operationId}>
                {() => <>{children}</>}
            </Operation>
        </Suspense>
    );
}`
    },
    {
      name: 'User.tsx',
      language: 'tsx',
      code: `function User() {
    const {service} = useServiceConsumer(UserService);

    const {operationId} = useSaga({
        id: 'fetch-user',
        onLoad: service.getUserInfo
    })

    const {result} = useOperation({operationId, suspense: true})

    return <div>Hello, {result?.login}</div>;
}
`
    },
    {
        name: "index.tsx",
        hidden: true,
        code: `render(
    <App>
        <User />
    </App>
)
`
    }
  ]}
/>
