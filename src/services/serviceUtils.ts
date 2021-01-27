import { bindActionCreators, Store } from 'redux';
import { Indexed } from '@iiiristram/ts-type-utils';

import { ActionAPI, ExtractOperation } from '../types';
import { BaseService } from './BaseService';
import { createActions } from '../utils/createActions';

const bindActions = <A extends Indexed>(obj: A, store: Store) => {
    const result: Indexed = {};

    Object.keys(obj).forEach(key => {
        const subObj = obj[key];
        result[key] =
            typeof subObj === 'function' ? bindActionCreators(subObj, store.dispatch) : bindActions(subObj, store);
    });

    return result as A;
};

export function getOperationId<T>(fn: T) {
    const id = (fn as any)?.id;
    if (typeof id !== 'string') {
        throw new Error('Target is not an operation');
    }

    return id as ExtractOperation<T>;
}

function cache<TArgs extends any[], TRes>(fn: (...args: TArgs) => TRes, getKey: (...args: TArgs) => string) {
    const cache: Record<string, TRes> = {};

    return (...args: TArgs) => {
        const key = getKey(...args);
        cache[key] = cache[key] || fn(...args);
        return cache[key];
    };
}

export const createServiceActions = cache(
    function <T extends BaseService<any, any>>(service: T, bind?: Store) {
        const actions = createActions(service, service.getUUID());
        return ((bind ? bindActions(actions, bind) : actions) as any) as ActionAPI<T>;
    },
    (service, bind) => `${service}_${service.getUUID()}_${!!bind}`
);
