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
