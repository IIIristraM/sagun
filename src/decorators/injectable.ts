type Ctr = { new (...args: any): any };

// export function inject<C extends Ctr>(ctr: C) {
//     return function (
//         target: Ctr & { __injects: Ctr[] },
//         propertyKey: string | symbol,
//         parameterIndex: number,
//     ) {
//         if (!target.hasOwnProperty('__injects')) {
//             target.__injects = Array(target.length);
//         }

//         target.__injects[parameterIndex] = ctr;
//     };
// }

export function injectable<T extends Ctr>(constructor: T) {
    return constructor;
}
