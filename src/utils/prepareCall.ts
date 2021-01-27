import { Callable, CallEffectTarget } from '../types';

export function prepareCall<TArgs extends any[] = any[], TRes = any>(
    target: CallEffectTarget<TArgs, TRes>
): [object | undefined, Callable<TArgs, TRes>] {
    return target instanceof Array ? target : [this, target];
}
