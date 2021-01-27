import { Indexed } from '@iiiristram/ts-type-utils';

export function getKeys(source: Indexed) {
    const props = new Set<string>();

    let obj = source;
    do {
        const keys = Object.getOwnPropertyNames(obj);

        keys.forEach(key => props.add(key));

        obj = Object.getPrototypeOf(obj);
    } while (obj && obj !== Object.prototype && obj !== Function.prototype);

    return Array.from(props);
}

export function getClassMethods<T extends Indexed | Function>(source: T) {
    let props = getKeys(source);

    const omitMethods = [
        ...Object.getOwnPropertyNames(Object.prototype),
        ...Object.getOwnPropertyNames(Function.prototype),
    ];

    props = props.filter(key => {
        return source[key as keyof T] instanceof Function && !omitMethods.includes(key) && key[0] !== '_';
    });

    return props;
}
