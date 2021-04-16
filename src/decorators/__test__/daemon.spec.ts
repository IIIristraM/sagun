import { call, delay, put, select } from 'typed-redux-saga';
import { Indexed } from '@iiiristram/ts-type-utils';

import { getSagaRunner } from '_test/utils';

import { daemon, DaemonMode } from '../daemon';
import { getId, OperationService, Service, serviceActionsFactory } from '../../services';
import { operation } from '../operation';
import reducer from '../../reducer';

const createServiceActions = serviceActionsFactory();
const operationService = new OperationService({ hash: {} });
const runner = getSagaRunner(reducer);

test('default mode is DaemonMode.Sync', () => {
    // tslint:disable-next-line: max-classes-per-file
    class TestServiceClass {
        toString() {
            return 'TestService';
        }

        @daemon()
        method(): null {
            return null;
        }
    }

    const testService = new TestServiceClass();
    expect((testService.method as any).__$daemonMode).toEqual(DaemonMode.Sync);
});

test('each service instance has uniq actions', () => {
    class TestServiceClass extends Service {
        toString() {
            return 'TestService';
        }

        @daemon()
        *method() {
            return null;
        }
    }

    const testService1 = new TestServiceClass(operationService);
    const testService2 = new TestServiceClass(operationService);

    const actions1 = createServiceActions(testService1);
    const actions1_dup = createServiceActions(testService1);
    const actions2 = createServiceActions(testService2);

    expect(actions1.method().type).not.toBe(actions2.method().type);
    expect(actions1.method().type).toBe(actions1_dup.method().type);
});

test('propagates return value', () => {
    // tslint:disable-next-line: max-classes-per-file
    class TestService {
        toString() {
            return 'TestService';
        }

        @daemon()
        method() {
            return 1;
        }
    }

    const testService = new TestService();
    return runner
        .run(function* () {
            return yield* call(testService.method);
        })
        .toPromise()
        .then(runResult => {
            expect(runResult).toBe(1);
        });
});

test('keeps this', () => {
    const mock = jest.fn();

    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @daemon()
        *method() {
            expect(this instanceof TestService).toBe(true);
            mock();
            return 1;
        }
    }

    const testService = new TestService(operationService);
    const actions = createServiceActions(testService);

    return runner
        .run(function* () {
            yield* call(testService.run);
            yield* put(actions.method());
            yield delay(0);
            yield* call(testService.destroy);
        })
        .toPromise()
        .then(() => {
            expect(mock).toHaveBeenCalledTimes(1);
        });
});

test('handle exceptions', () => {
    // tslint:disable-next-line: max-classes-per-file
    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @daemon()
        @operation
        *operation() {
            yield* call(async () => {
                throw new Error('custom error');
            });
        }
    }
    const testService = new TestService(operationService);
    const actions = createServiceActions(testService);

    return runner
        .run(function* () {
            yield* call(testService.run);
            yield* put(actions.operation());
            yield* delay(0);

            const state = ((yield* select()) as any) as Indexed;
            const operationId = getId(testService.operation);
            expect(state.get(operationId)).toBeTruthy();
            expect(state.get(operationId).isLoading).toBe(false);
            expect(state.get(operationId).isError).toBe(true);
            expect(state.get(operationId).error).toBeTruthy();
            yield* call(testService.destroy);
        })
        .toPromise();
});
