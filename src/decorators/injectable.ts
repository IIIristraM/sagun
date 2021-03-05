import { Ctr, CtrWithInject } from '../types';

export function inject<C extends Ctr<any>>(ctr: C) {
    return function (target: CtrWithInject<any>, propertyKey: string | symbol, parameterIndex: number) {
        if (!target.hasOwnProperty('__injects')) {
            target.__injects = Array.from({ length: target.length });
        }

        if (!target.__injects) return;
        target.__injects[parameterIndex] = ctr;
    };
}

// export function injectable<T extends Ctr<any>>(constructor: T) {
//     return constructor;
// }
