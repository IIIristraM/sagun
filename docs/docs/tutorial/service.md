# Creating a Service

import MultiFilePlayground from '@site/src/components/MultiFilePlayground';

Writing business logic in hooks is not a good practice as it blurs the boundaries between application layers, complicates extension and testing. It's better to move logic to a separate UI-agnostic layer — that's why the framework has the [service](../concepts/services.md) abstraction.

A service is a regular class that describes part of the domain or part of application logic in complex scenarios.

Let's create a service for working with the user entity:

```ts
class UserService extends Service {
    // required for DI and Redux action generation
    toString() {
        return "UserService"
    }

    // Mark that the method result should be stored in the store
    @operation
    *getUserInfo() {
        return yield* call(fetchUser);
    }
}
```

Now we need to create a service instance once and register it in the DI container. This can be done in any component — for this example, we'll do it at the application root.

```tsx
function App({children}) {
    const di = useDI();
    
    // create and register service
    const userService = di.createService(UserService);
    di.registerService(userService)

    // initialize service (this is an async process in general)
    const {operationId} = useService(userService);

    return (
        <Suspense fallback="Loading data...">
            <Operation operationId={operationId}>
                {() => <>{children}</>}
            </Operation>
        </Suspense>
    );
}
```

:::tip

It's recommended to register a service in the component where it's needed. For example, if a service is only needed on one specific page, register it there.

This is because the framework has a [memory management mechanism](../concepts/memory-cleanup.md) that works more efficiently the closer services are to the component tree where they're needed.

:::

Now we can use the service in any component:

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

We've written a noticeable amount of additional code, but now our user logic is described and can be tested separately from React and component lifecycle. Further steps will reveal more advantages of this approach.

Full example:

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

    // unregisterService is required in the live editor for service code updates to work
    di.unregisterService(UserService)
    const userService = di.createService(UserService);
    di.registerService(userService)

    const {operationId} = useService(userService);

    return (
        <Suspense fallback="Loading data...">
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
