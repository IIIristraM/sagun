import { call } from 'typed-redux-saga';

import { useSaga, UseSagaOptions, UseSagaOutput } from './useSaga';
import { BaseService } from '../services/BaseService';

export function useService<TRes>(service: BaseService<[], TRes>): UseSagaOutput<TRes, []>;

export function useService<TArgs extends any[], TRes>(
    service: BaseService<TArgs, TRes>,
    args: TArgs,
    options?: UseSagaOptions<TArgs, TRes>
): UseSagaOutput<TRes, TArgs>;

export function useService<TArgs extends any[]>(service: BaseService<TArgs>, args?: TArgs) {
    const onLoad = function* (...args: TArgs) {
        return yield* call(service.run, ...args);
    };

    const onDispose = function* (...args: TArgs) {
        return yield* call(service.destroy, ...args);
    };

    return useSaga({ onLoad, onDispose }, args || []);
}
