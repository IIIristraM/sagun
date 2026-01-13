import { expect, test } from 'vitest';

import { call } from 'typed-redux-saga';

import { getSagaRunner } from '../../test-utils';

import { AsyncOperation, OperationId } from '../../types';
import { createOperation } from '../createOperation';
import { errorHandler } from '../errorHandler';

console.warn = () => {};
console.error = () => {};

const id = 'id' as OperationId<number>;

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
    const runner = getSagaRunner();

    return runner
        .run(function* () {
            yield* call(operation.run, 1, 1);
        })
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
    const runner = getSagaRunner();

    return runner
        .run(function* () {
            yield* call(operation.run, 1, 1);
        })
        .then(onErrorHandled, onErrorBubble);
});

test('operation persists in store', () => {
    const runner = getSagaRunner();
    const operation = createOperation(id, func);

    return runner
        .run(() => operation.run())
        .then(() => {
            expect(runner.store.getState().asyncOperations.get(id)).toMatchObject({ isLoading: false, args: [] });
        });
});

test('Operation created even if failed', () => {
    const runner = getSagaRunner();
    const error = new Error('Exception');
    const operation = createOperation(id, () => {
        throw error;
    });

    // приходится экранировать ошибку через errorHandler
    // иначе не получится получить стор из результата
    return runner.run(errorHandler(operation.run)).then(({ state }) => {
        expect(state.asyncOperations.get(id)).toMatchObject({
            isLoading: false,
            isError: true,
            error,
        });
    });
});

test('operation removed', () => {
    const runner = getSagaRunner();
    const operation = createOperation(id, func);

    return runner
        .run(function* () {
            yield* call(operation.run);
            yield* call(operation.destroy);
        })
        .then(({ state }) => {
            expect(state.asyncOperations.get(id)).toBeFalsy();
        });
});

test('strategy properly updates operation', () => {
    const runner = getSagaRunner();
    const operation = createOperation(id, func, ({ result, ...rest }: AsyncOperation<number>) => {
        return { result: (result || 0) + 1, ...rest };
    });

    return runner.run(operation.run).then(({ result, state }) => {
        expect(state.asyncOperations.get(id)?.result).toBe(2);
        expect(result).toBe(1);
    });
});
