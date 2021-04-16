import { apply } from 'typed-redux-saga';

import { CallEffectTarget, Saga } from '../types';
import { prepareCall } from './prepareCall';

export function errorHandler<TArgs extends any[], TRet>(gen: CallEffectTarget<TArgs, TRet>, propagate = false) {
    return function* catcher(...args) {
        try {
            const target = prepareCall(gen);
            return yield* apply(target[0], target[1], args);
        } catch (error) {
            console.warn(error);

            if (propagate) {
                throw error;
            }
        }
    } as Saga<TArgs, TRet>;
}
