import { createActions } from '../createActions';

test('createActions', () => {
    class TestService {
        toString() {
            return this.constructor.name;
        }

        *method(...args: any[]) {
            return 1;
        }
    }

    const service = new TestService();
    const actions = createActions(service, '0');

    expect(actions.method().type).toBe('TEST_SERVICE_METHOD_0');
});

test('createActions types', () => {
    class TestService {
        toString() {
            return this.constructor.name;
        }

        protected *baz(x: number) {
            return 1;
        }

        foo(x: number) {
            return 1;
        }

        *bar(x: number, y: string) {
            return 1;
        }

        *tuple(...args: [string, string?]) {
            return 1;
        }
    }

    const service = new TestService();
    const actions = createActions(service);

    actions.bar(1, '1');
    // @ts-expect-error
    actions.bar(1, 1);
    // @ts-expect-error
    actions.foo?.();
    // @ts-expect-error
    actions.baz?.();
    actions.tuple('1', '1');
    actions.tuple('1');
    // @ts-expect-error
    actions.tuple('1', 1);
});
