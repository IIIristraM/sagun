import { call } from 'typed-redux-saga';

import { getSagaRunner } from '_test/utils';

import { AsyncOperation, OperationId } from '../../types';
import { createOperation } from '../createOperation';
import { errorHandler } from '../errorHandler';
import reducer from '../../reducer';

console.warn = () => {};
console.error = () => {};

const id = 'id' as OperationId<number>;
const runner = getSagaRunner(reducer);

const func = () => {
    return 1;
};

test('Operation invoked with proper args', () => {
    let result = 0;
    const sum = function* (a: number, b: number) {
        result += a + b;
        return result;
    };
    const operation = createOperation(id, sum);

    return runner
        .run(function* () {
            yield* call(operation.run, 1, 1);
        })
        .toPromise()
        .then(() => {
            expect(result).toBe(2);
        });
});

test('exceptions bubble', () => {
    const operation = createOperation(id, function () {
        throw new Error('Exception');
    });
    const onErrorHandled = () => Promise.reject(new Error('Exceptions do not bubble'));
    const onErrorBubble = () => Promise.resolve();

    return runner
        .run(function* () {
            yield* call(operation.run, 1, 1);
        })
        .toPromise()
        .then(onErrorHandled, onErrorBubble);
});

test('operation persists in store', () => {
    const operation = createOperation(id, func);

    return runner
        .run(operation.run)
        .toPromise()
        .then(() => {
            expect(runner.store.getState()).toMatchObject({
                [id]: { isLoading: false, args: [] },
            });
        });
});

test('Operation created even if failed', () => {
    const error = new Error('Exception');
    const operation = createOperation(id, () => {
        throw error;
    });

    // приходится экранировать ошибку через errorHandler
    // иначе не получится получить стор из результата
    return runner
        .run(errorHandler(operation.run))
        .toPromise()
        .then(() => {
            expect(runner.store.getState()).toMatchObject({
                [id]: { isLoading: false, isError: true, error },
            });
        });
});

test('operation removed', () => {
    const operation = createOperation(id, func);

    return runner
        .run(function* () {
            yield* call(operation.run);
            yield* call(operation.destroy);
        })
        .toPromise()
        .then(() => {
            expect(runner.store.getState()).not.toHaveProperty(id);
        });
});

test('strategy properly updates operation', () => {
    const operation = createOperation(id, func, ({ result, ...rest }: AsyncOperation<number>) => {
        return { result: (result || 0) + 1, ...rest };
    });

    return runner
        .run(operation.run)
        .toPromise()
        .then(runResult => {
            expect(runner.store.getState()[id].result).toBe(2);
            expect(runResult).toBe(1);
        });
});
