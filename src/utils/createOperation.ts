import { call, put } from 'typed-redux-saga';

import type { AsyncOperation, CallEffectTarget, Gen, IOperationUpdateStrategy, OperationId } from '../types';
import { actions as operationActions } from '../reducer';
import { prepareCall } from './prepareCall';

type Operation<TArgs extends any[], TRes> = {
    id: string;
    run: (...args: TArgs) => Gen<TRes | undefined>;
    destroy: () => Gen<any>;
};

const { addOrUpdateOperation, removeOperation } = operationActions;

const defaultUpdateStrategy = (operation: AsyncOperation<any, any, any>) => {
    return operation;
};

export const createOperation = <TArgs extends any[], TRes>(
    id: OperationId<TRes, TArgs>,
    genFunc: CallEffectTarget<TArgs, TRes>,
    updateStrategy: IOperationUpdateStrategy<TRes, TArgs> = defaultUpdateStrategy
): Operation<TArgs, TRes> => {
    const run = function* (...args: TArgs) {
        let error: Error | undefined = undefined;
        let result: TRes | undefined = undefined;

        let operation = yield* call(updateStrategy, {
            id,
            isLoading: true,
            isError: false,
            error,
            result,
            args,
        });

        yield* put(addOrUpdateOperation(operation));

        if (operation.isBlocked) {
            return operation.result;
        }

        try {
            result = (yield* call(prepareCall.call(this, genFunc), ...args)) as TRes | undefined;
        } catch (e) {
            error = e;
            throw e;
        } finally {
            operation = yield* call(updateStrategy, { id, isError: !!error, error, isLoading: false, result, args });
            yield* put(addOrUpdateOperation(operation));
        }

        return result;
    };

    const destroy = function* () {
        yield* put(removeOperation(id));
    };

    return {
        id,
        run,
        destroy,
    };
};
