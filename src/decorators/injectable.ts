import { CtrWithInject, InjectionKey } from '../types';

export function inject<C extends InjectionKey>(key: C) {
    return function (target: CtrWithInject<any>, propertyKey: string | symbol, parameterIndex: number) {
        if (!target.hasOwnProperty('__injects')) {
            target.__injects = Array.from({ length: target.length });
        }

        if (!target.__injects) return;
        target.__injects[parameterIndex] = key;
    };
}

// export function injectable<T extends Ctr<any>>(constructor: T) {
//     return constructor;
// }
