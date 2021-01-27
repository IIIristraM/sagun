import { call } from 'typed-redux-saga';

import { CallEffectTarget } from '../types';
import { prepareCall } from './prepareCall';

export function errorHandler<TArgs extends any[], TRet>(gen: CallEffectTarget<TArgs, TRet>, propagate = false) {
    return function* catcher(...args: TArgs) {
        try {
            return yield* call(prepareCall(gen), ...args);
        } catch (error) {
            console.warn(error);

            if (propagate) {
                throw error;
            }
        }
    };
}
