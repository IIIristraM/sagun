import { ActionCreator, bindActionCreators, Store } from 'redux';

import { ActionAPI, ExtractOperation } from '../types';
import { BaseService } from './BaseService';
import { createActions } from '../utils/createActions';

type ActionsMap = {
    [key: string]: ActionCreator<unknown> | ActionsMap;
};

function bindActions<A extends ActionsMap>(obj: A, store: Store) {
    const result: ActionsMap = {};

    function keyMap(key: string) {
        const subObj = obj[key];
        result[key] =
            typeof subObj === 'function' ? bindActionCreators(subObj, store.dispatch) : bindActions(subObj, store);
    }

    Object.keys(obj).forEach(keyMap);

    return result as A;
}

export function getId<T>(fn: T) {
    const id = (fn as any)?.id;
    if (typeof id !== 'string') {
        throw new Error('Target is not an operation');
    }

    return id as ExtractOperation<T>;
}

function cache<TArgs extends any[], TRes>(fn: (...args: TArgs) => TRes, getKey: (...args: TArgs) => string) {
    const cache: Record<string, TRes> = {};

    return function cached(...args: TArgs) {
        const key = getKey(...args);
        cache[key] = cache[key] || fn(...args);
        return cache[key];
    };
}

function serviceCacheKey<T extends BaseService<any, any>>(service: T, bind?: Store) {
    return `${service}_${service.getUUID()}_${!!bind}`;
}

export function serviceActionsFactory() {
    return cache(function <T extends BaseService<any, any>>(service: T, bind?: Store) {
        const actions = createActions(service, service.getUUID());
        return (bind ? bindActions(actions, bind) : actions) as any as ActionAPI<T>;
    }, serviceCacheKey);
}
