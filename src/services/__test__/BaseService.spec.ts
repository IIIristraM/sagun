import { call, delay } from 'typed-redux-saga';

import { getSagaRunner } from '_test/utils';

import { BaseService } from '../BaseService';
import { getOperationId } from '../serviceUtils';
import { OperationId } from '../../types';

const runner = getSagaRunner();

describe('BaseService', () => {
    test('keeps this', () => {
        const mockFn = jest.fn();

        // tslint:disable-next-line: max-classes-per-file
        class TestService extends BaseService {
            toString() {
                return 'TestService';
            }

            public *method() {
                expect(this instanceof TestService).toBe(true);
                mockFn();
            }

            public *run() {
                yield call(this.method);
                return yield call([this, super.run]);
            }

            public *destroy() {
                yield call(this.method);
                yield call([this, super.destroy]);
            }
        }

        const service = new TestService();

        return runner
            .run(function* () {
                yield call(service.run);
                yield call(service.method);
                yield delay(0);
                yield call(service.destroy);
            })
            .toPromise()
            .then(() => {
                expect(mockFn).toHaveBeenCalledTimes(3);
            });
    });
    test('propagates this for inherited methods', () => {
        const mockFn = jest.fn();

        // tslint:disable-next-line: max-classes-per-file
        class TestServiceA extends BaseService {
            toString() {
                return 'TestServiceA';
            }

            public *method(): Generator<unknown> {
                expect(this instanceof TestServiceB).toBe(true);
                mockFn();
            }
        }

        // tslint:disable-next-line: max-classes-per-file
        class TestServiceB extends TestServiceA {
            toString() {
                return 'TestServiceB';
            }

            public *method() {
                expect(this instanceof TestServiceB).toBe(true);
                yield call([this, super.method]);
                mockFn();
            }
        }

        const service = new TestServiceB();

        return runner
            .run(function* () {
                yield call(service.run);
                yield call(service.method);
            })
            .toPromise()
            .then(() => {
                expect(mockFn).toHaveBeenCalledTimes(2);
            });
    });

    test('Service has properly typed ids for methods', () => {
        // tslint:disable-next-line: max-classes-per-file
        class TestService extends BaseService {
            toString() {
                return 'TestService';
            }

            public *method(a: number, b?: string) {
                return 1;
            }
        }

        const service = new TestService();

        try {
            let id = getOperationId(service.method);
            id = id as OperationId<number, [number, string?]>;
            // @ts-expect-error
            id = id as OperationId<{}, [number, string?]>;
            // @ts-expect-error
            id = id as OperationId<number, [string, string]>;
            // @ts-expect-error
            id = id as number;
        } catch {
            // no operation decorator -> error
        }
    });
});
