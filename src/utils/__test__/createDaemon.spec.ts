import { call, delay, fork, put } from 'typed-redux-saga';

import { getSagaRunner } from '_test/utils';

import { createDaemon, daemon, DaemonMode } from '../createDaemon';
import { createDeferred } from '../createDeferred';

const runner = getSagaRunner();

console.warn = () => {};

describe('daemon', () => {
    test('Check daemon called proper times with proper args', () => {
        let result = 0;
        const actionType = 'SUM';
        const action = { type: actionType, payload: [1, 1] };
        const sum = function* (a: number, b: number) {
            result += a + b;
            return result;
        };

        return runner
            .run(function* () {
                const task = yield* fork(daemon, actionType, sum);
                yield* put(action);
                yield* put(action);
                task.cancel();
            })
            .toPromise()
            .then(() => {
                expect(result).toBe(4);
            });
    });

    test('by default daemon does not run new operation till previous complete', () => {
        const func = jest.fn(() => {
            /* */
        });
        const actionType = 'CALL_FUNC';
        const action = { type: actionType };
        const saga = function* () {
            func();
            yield* delay(10);
        };
        const main = function* () {
            const task = yield* fork(() => daemon(actionType, saga));
            yield* put(action);
            yield* put(action);
            task.cancel();
        };

        return runner
            .run(main)
            .toPromise()
            .then(() => {
                expect(func).toHaveBeenCalledTimes(1);
            });
    });

    test('exception does not terminate daemon', () => {
        let result = 0;
        let isFirst = true;
        const actionType = 'SUM';
        const error = new Error('Exception');
        const action = { type: actionType, payload: [1, 1] };
        const sum = function* (a: number, b: number) {
            if (isFirst) {
                isFirst = false;
                throw error;
            }

            result += a + b;
            return result;
        };

        const main = function* () {
            const task = yield* fork(() => daemon(actionType, sum));
            yield* put(action);
            yield* put(action);
            task.cancel();
        };

        return runner
            .run(main)
            .toPromise()
            .then(() => {
                expect(result).toBe(2);
            });
    });
});

describe('createDaemon', () => {
    test('daemon starts and running', () => {
        let result = 0;
        const actionType = 'SUM';
        const action = { type: actionType, payload: [1, 1] };
        const sum = function* (a: number, b: number) {
            result += a + b;
            return result;
        };
        const daemon = createDaemon(actionType, sum);

        function* main() {
            yield* call(daemon.run);
            yield* put(action);
            yield* put(action);
            yield* call(daemon.destroy);
        }

        return runner
            .run(main)
            .toPromise()
            .then(() => {
                expect(result).toBe(4);
            });
    });

    test('daemon runs only once', () => {
        let result = 0;
        const actionType = 'SUM';
        const action = { type: actionType, payload: [1, 1] };
        const sum = function* (a: number, b: number) {
            result += a + b;
            return result;
        };
        const daemon = createDaemon(actionType, sum);

        function* main() {
            yield* call(daemon.run);
            yield* call(daemon.run);
            yield* put(action);
            yield* call(daemon.destroy);
        }

        return runner
            .run(main)
            .toPromise()
            .then(() => {
                expect(result).toBe(2);
            });
    });

    test('daemon successfully destroyed', () => {
        let result = 0;
        const actionType = 'SUM';
        const action = { type: actionType, payload: [1, 1] };
        const sum = function* (a: number, b: number) {
            result += a + b;
            return result;
        };
        const daemon = createDaemon(actionType, sum);

        const saga = function* () {
            yield* call(daemon.run);
            yield* put(action);
            yield* call(daemon.destroy);
            yield* put(action);
        };

        return runner
            .run(saga)
            .toPromise()
            .then(() => {
                expect(result).toBe(2);
            });
    });

    test('mode Every catch every call', () => {
        const func = jest.fn(() => {
            /* */
        });
        const actionType = 'CALL_FUNC';
        const action = { type: actionType };
        const saga = function* () {
            func();
            yield* delay(10);
        };
        const daemon = createDaemon(actionType, saga, { mode: DaemonMode.Every });
        const main = function* () {
            yield* call(daemon.run);
            yield* put(action);
            yield* put(action);
            yield* call(daemon.destroy);
        };

        return runner
            .run(main)
            .toPromise()
            .then(() => {
                expect(func).toHaveBeenCalledTimes(2);
            });
    });

    test('mode Every terminates on destroy', () => {
        const func = jest.fn(() => {
            /* */
        });
        const actionType = 'CALL_FUNC';
        const action = { type: actionType };
        const saga = function* () {
            return func();
        };
        const daemon = createDaemon(actionType, saga, { mode: DaemonMode.Every });
        const main = function* () {
            yield* call(daemon.run);
            yield* put(action);
            yield* call(daemon.destroy);
            yield* put(action);
        };

        return runner
            .run(main)
            .toPromise()
            .then(() => {
                expect(func).toHaveBeenCalledTimes(1);
            });
    });

    test('mode Every does not terminate on exceptions', () => {
        let isFirst = true;
        const error = new Error('Exception');
        const func = jest.fn(() => {
            /* */
        });
        const actionType = 'CALL_FUNC';
        const action = { type: actionType };
        const saga = function* () {
            if (isFirst) {
                isFirst = false;
                throw error;
            }

            return func();
        };

        const daemon = createDaemon(actionType, saga, { mode: DaemonMode.Every });

        function* main() {
            yield* call(daemon.run);
            yield* put(action);
            yield* put(action);
            yield* call(daemon.destroy);
        }

        return runner
            .run(main)

            .toPromise()
            .then(() => {
                expect(func).toHaveBeenCalledTimes(1);
            });
    });

    test('mode Last catch last call', () => {
        const defer = createDeferred();
        const func = jest.fn((arg: any) => {
            defer.resolve();
        });

        const actionType = 'CALL_FUNC';
        let count = 0;
        const actionCreator = () => {
            count++;
            return { type: actionType, payload: [count] };
        };
        const saga = function* (arg: any) {
            yield* delay(10);
            func(arg);
        };
        const daemon = createDaemon(actionType, saga, { mode: DaemonMode.Last });
        const main = function* () {
            yield* call(daemon.run);
            yield* put(actionCreator());
            yield* put(actionCreator());
            yield* put(actionCreator());
            yield* put(actionCreator());
            yield defer.promise;
            yield* call(daemon.destroy);
        };

        return runner
            .run(main)
            .toPromise()
            .then(() => {
                expect(func).toHaveBeenCalledTimes(1);
                expect(func).toHaveBeenLastCalledWith(count);
            });
    });

    test('mode Last terminated on destroy', () => {
        const func = jest.fn(() => {
            /* */
        });
        const actionType = 'CALL_FUNC';
        const action = { type: actionType };
        const saga = function* () {
            return func();
        };
        const daemon = createDaemon(actionType, saga, { mode: DaemonMode.Last });
        const main = function* () {
            yield* call(daemon.run);
            yield* put(action);
            yield* call(daemon.destroy);
            yield* put(action);
        };

        return runner
            .run(main)
            .toPromise()
            .then(() => {
                expect(func).toHaveBeenCalledTimes(1);
            });
    });

    test('mode Last does note terminates on exceptions', () => {
        let isFirst = true;
        const error = new Error('Exception');
        const func = jest.fn(() => {
            if (isFirst) {
                isFirst = false;
                throw error;
            }
        });
        const actionType = 'CALL_FUNC';
        const action = { type: actionType };
        const saga = function* () {
            yield* call(func);
        };

        const daemon = createDaemon(actionType, saga, { mode: DaemonMode.Last });

        function* main() {
            yield* call(daemon.run);
            yield* put(action);
            yield* put(action);
            yield* call(daemon.destroy);
        }

        return runner
            .run(main)
            .toPromise()
            .then(() => {
                expect(func).toHaveBeenCalledTimes(2);
            });
    });

    test('mode Schedule works properly', () => {
        const timeout = 20;
        const expectedCalls = 5.2;
        const func = jest.fn((arg: any) => {
            /* */
        });

        const daemon = createDaemon(timeout, func, { mode: DaemonMode.Schedule });
        const main = function* () {
            yield* call(daemon.run);
            yield* delay(timeout * expectedCalls);
            yield* call(daemon.destroy);
        };

        return runner
            .run(main)
            .toPromise()
            .then(() => {
                const diff = Math.ceil(expectedCalls) - func.mock.calls.length;
                expect(func.mock.calls.length).toBeTruthy();
                expect(diff).toBeGreaterThanOrEqual(0);
            });
    });

    test('daemon throw exception if pattern is number except Schedule mode', () => {
        return runner
            .run(function* () {
                try {
                    return createDaemon(5, () => {
                        /* */
                    });
                } catch (e) {
                    return e;
                }
            })
            .toPromise()
            .then((result: any) => {
                expect(result instanceof Error).toBe(true);
            });
    });
});
