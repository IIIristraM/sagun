import { all, call } from 'typed-redux-saga';

import { useSaga, UseSagaOptions, UseSagaOutput } from './useSaga';
import { BaseService } from '../services/BaseService';

export function useService<TRes>(service: BaseService<[], TRes> | Array<BaseService<[], any>>): UseSagaOutput<TRes, []>;

export function useService<TArgs extends any[], TRes>(
    service: BaseService<TArgs, TRes> | Array<BaseService<TArgs, any>>,
    args: TArgs,
    options?: UseSagaOptions<TArgs, TRes>
): UseSagaOutput<TRes, TArgs>;

export function useService<TArgs extends any[]>(service: BaseService<TArgs> | Array<BaseService<TArgs>>, args?: TArgs) {
    const services = Array.isArray(service) ? service : [service];

    const onLoad = function* (...args: TArgs) {
        return yield* all(services.map(service => call(service.run, ...args)));
    };

    const onDispose = function* (...args: TArgs) {
        return yield* all(services.map(service => call(service.destroy, ...args)));
    };

    return useSaga(
        { id: `init-${services.map(service => service.toString()).join('-')}`, onLoad, onDispose },
        args || []
    );
}
