import { call, select } from 'typed-redux-saga';
import { Indexed } from '@iiiristram/ts-type-utils';

import { getSagaRunner } from '_test/utils';

import { AsyncOperation, OperationId } from '../../types';
import { getId, OperationService, Service } from '../../services';
import { operation } from '../operation';
import reducer from '../../reducer';

const runner = getSagaRunner(reducer);

const TEST_ID = 'TEST_ID' as OperationId<number, [number?]>;
const operationService = new OperationService({ hash: {} });

test('without args', () => {
    // tslint:disable-next-line: max-classes-per-file
    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @operation
        *operation() {
            return 1;
        }
    }
    const testService = new TestService(operationService);

    expect(testService.operation).toHaveProperty('id');
    expect(getId(testService.operation)?.startsWith('TEST_SERVICE_OPERATION')).toBe(true);
});

test('with id', () => {
    // tslint:disable-next-line: max-classes-per-file
    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @operation(TEST_ID)
        *operation() {
            return 1;
        }

        // @ts-expect-error
        @operation(TEST_ID)
        *operation2() {
            return '1';
        }

        // @ts-expect-error
        @operation(TEST_ID)
        *operation3(x: string) {
            return 1;
        }
    }
    const testService = new TestService(operationService);

    expect(getId(testService.operation)?.startsWith(TEST_ID)).toBe(true);
});

test('with object', () => {
    // tslint:disable-next-line: max-classes-per-file
    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @operation({ id: TEST_ID, ssr: true })
        *operation() {
            return 1;
        }

        // @ts-expect-error
        @operation({ id: TEST_ID })
        *operation2() {
            return '1';
        }

        // @ts-expect-error
        @operation({ id: TEST_ID, ssr: true })
        *operation3() {
            return '1';
        }

        // @ts-expect-error
        @operation({ id: TEST_ID })
        *operation4(x: string) {
            return 1;
        }
    }
    const testService = new TestService(operationService);

    expect(getId(testService.operation)?.startsWith(TEST_ID)).toBe(true);
});

test('outer operation hides inner for method id', () => {
    // tslint:disable-next-line: max-classes-per-file
    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @operation(TEST_ID)
        // @ts-expect-error
        @operation('xxx')
        *operation() {
            return 1;
        }
    }
    const testService = new TestService(operationService);

    expect(getId(testService.operation)?.startsWith(TEST_ID)).toBe(true);
});

test('propagates id even if operation is not the top decorator', () => {
    const someDecorator = (target: any, key: string, descriptor: PropertyDescriptor): PropertyDescriptor => {
        return descriptor;
    };

    // tslint:disable-next-line: max-classes-per-file
    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @someDecorator
        @operation(TEST_ID)
        *operation() {
            return 1;
        }
    }
    const testService = new TestService(operationService);

    expect(getId(testService.operation)?.startsWith(TEST_ID)).toBe(true);
});

test('propagates return value', () => {
    // tslint:disable-next-line: max-classes-per-file
    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @operation
        *method() {
            return 1;
        }
    }

    const testService = new TestService(operationService);

    return runner
        .run(function* () {
            return yield* call(testService.method);
        })
        .toPromise()
        .then(runResult => {
            expect(runResult).toBe(1);
        });
});

test('properly invoke updateStrategy', () => {
    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @operation({
            ssr: true,
            updateStrategy: ({ result, ...rest }: AsyncOperation<number, [number?]>) => {
                return { result: (result || 0) + 1, ...rest };
            },
        })
        *method() {
            return 1;
        }

        // @ts-expect-error
        @operation({
            updateStrategy: ({ result, ...rest }: AsyncOperation<number, [number?]>) => {
                return { result, ...rest };
            },
        })
        *method2() {
            return '1';
        }

        // @ts-expect-error
        @operation({
            id: TEST_ID,
            ssr: true,
            updateStrategy: ({ result, ...rest }: AsyncOperation<number, [string]>) => {
                return { result, ...rest };
            },
        })
        *method3(x: string) {
            return 1;
        }
    }

    const testService = new TestService(operationService);

    return runner
        .run(function* () {
            return yield* call(testService.method);
        })
        .toPromise()
        .then(() => {
            const { result } = runner.store.getState().get(getId(testService.method)!)!;
            expect(result).toBe(2);
        });
});

test('keeps this', () => {
    // tslint:disable-next-line: max-classes-per-file
    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        private _x: number;

        constructor(x: number) {
            super(operationService);
            this._x = x;
        }

        @operation
        *method() {
            expect(this._x).toBe(1);
            expect(this).toBe(testService);
            return 1;
        }
    }

    const testService = new TestService(1);

    return runner
        .run(function* () {
            return yield* call(testService.method);
        })
        .toPromise()
        .then(runResult => {
            expect(runResult).toBe(1);
        });
});

test('enabled for private methods', () => {
    // @ts-ignore
    // tslint:disable-next-line: max-classes-per-file
    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @operation({
            updateStrategy: ({ id, result }: AsyncOperation<number>) => ({ id, result }),
        })
        private *method() {
            return 1;
        }

        method2() {
            return this.method();
        }
    }
});

test('function generated ids', () => {
    // @ts-ignore
    // tslint:disable-next-line: max-classes-per-file
    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @operation({
            id: (x: number) => x.toString() as OperationId<number, [number]>,
            updateStrategy: (operation: AsyncOperation<number, [number]>) => operation,
        })
        private static *method(x: number) {
            return x;
        }

        @operation({
            id: (x: number) => `${x}_2` as OperationId<number, [number]>,
        })
        static *method2(x: number) {
            return yield* call(TestService.method, x);
        }

        @operation((x: number) => `${x}_3` as OperationId<number, [number]>)
        static *method3(x: number) {
            return yield* call(TestService.method2, x);
        }

        // @ts-expect-error
        @operation({
            id: (x: number) => x.toString() as OperationId<number, [number]>,
            updateStrategy: ({ result }: AsyncOperation<number, [number]>) => ({ result }),
        })
        static *method4(x: number) {
            return '1';
        }

        // @ts-expect-error
        @operation({
            id: (x: number) => `${x}_2` as OperationId<number, [number]>,
        })
        static *method5(x: string) {
            return x;
        }

        // @ts-expect-error
        @operation((x: number) => `${x}_3` as OperationId<number, [number]>)
        static *method6() {
            return yield* call(TestService.method, 1);
        }

        @operation(() => '7' as OperationId<number>)
        static *method7() {
            return yield* call(TestService.method, 1);
        }
    }
});

test('service correctly handle operations', () => {
    // tslint:disable-next-line: max-classes-per-file
    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @operation
        *method() {
            return 1;
        }

        @operation((x: number) => `${x}` as OperationId<number>)
        *method2(x: number) {
            return 1;
        }

        @operation((x: number) => `${x}` as OperationId<number>)
        *method3(x: number) {
            return 1;
        }
    }

    const service = new TestService(new OperationService({ hash: {} }));

    return runner
        .run(function* () {
            yield* call(service.run);
            yield* call(service.method);
            yield* call(service.method2, 10);
            yield* call(service.method2, 11);
            yield* call(service.method3, 12);
            yield* call(service.method3, 13);

            let state = ((yield* select()) as any) as Indexed;
            expect(state.get(getId(service.method)!)).toBeTruthy();
            expect(state.get('10')).toBeTruthy();
            expect(state.get('11')).toBeTruthy();
            expect(state.get('12')).toBeTruthy();
            expect(state.get('13')).toBeTruthy();

            yield* call(service.destroy);

            state = ((yield* select()) as any) as Indexed;
            expect(state.get(getId(service.method)!)).toBe(undefined);
            expect(state.get('10')).toBe(undefined);
            expect(state.get('11')).toBe(undefined);
            expect(state.get('12')).toBe(undefined);
            expect(state.get('13')).toBe(undefined);
        })
        .toPromise();
});

test('ssr only', () => {
    // @ts-ignore
    class TestService extends Service {
        toString() {
            return 'TestService';
        }

        @operation({
            ssr: true,
        })
        *method() {
            return 1;
        }
    }
});

// test('different ids for different service instances', () => {
//     class TestService extends Service {
//         @operation
//         public *operation() {
//             return 1;
//         }
//     }

//     const testService1 = new TestService(operationService);
//     const testService2 = new TestService(operationService);

//     expect(getOperationId(testService1.operation)).toBeTruthy();
//     expect(getOperationId(testService2.operation)).toBeTruthy();
//     expect(getOperationId(testService1.operation)).not.toBe(getOperationId(testService2.operation));
// });
