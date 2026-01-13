# Testing

In the previous steps, it was often mentioned that certain patterns help with testing.

Let's look at a test example in our application — for instance, let's verify that when a service method is called, the correct API is invoked.

First, let's mock our API, since we probably don't want our unit tests to depend on whether the backend is broken or not.

```ts
class TestAPI extends API {
    fetchUser = jest.fn();
}
```

Since we took care upfront to have explicit contract-based dependencies between our services and API, our test is very simple to write. The only catch is that all our logic is written with generators, but the framework has a `getSagaRunner` helper for executing them.

```ts
import { getSagaRunner } from  '@iiiristram/sagun/test-utils';

test("request user", () => {
    const runner = getSagaRunner();

    return runner.run(function * ({ operationService, store }) {
        const testApi = new TestAPI();
        const userService = new UserService(operationService, testApi);
        yield* call(userService.getUserInfo);

        // check that API was called
        expect(testApi.fetchUser).toHaveBeenCalled();

        // check that data appeared in store
        const userOperation = store.getState().asyncOperations.get(getId(userService.getUserInfo))
        expect(userOperation.result.login).toBe('John Doe');
    })
})
```

Based on this test example, I'd like to highlight several important points:
- React is not involved in the test at all — business logic is tested in isolation.
- Thanks to explicit contracts that we thought about in advance, we don't need to mock file exports. At first glance it might seem, what's the difference? But in practice, developers rarely consider module exports as a contract. So often it turns out that to write a test, either something that needs to be mocked isn't exported from a file, or you need to mock completely different modules that the original module relies on. Essentially, to write a test, you need to know the internal implementation of the module, which violates encapsulation. And there's a high risk that after updating the module to a new version, the test will need to be completely rewritten because the internal implementation changed significantly (possibly completely rewritten), even though the export contract didn't change.
