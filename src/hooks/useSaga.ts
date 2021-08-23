import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { ComponentLifecycleService, LoadOptions } from '../services';
import { ComponentSaga, OperationId } from '../types';
import { DisableSsrContext } from '../context';
import { isNodeEnv } from '../utils/isNodeEnv';
import { useDI } from './useDI';
import { UUIDGenerator } from '../services/UUIDGenerator';

export type UseSagaOptions<TArgs extends any[], TRes> = {
    operationOptions?: LoadOptions<TArgs, TRes>['options'];
};

export type UseSagaOutput<TRes, TArgs> = {
    operationId: OperationId<TRes, TArgs>;
    reload: () => void;
};

const EMPTY_ARR = [] as any[];

export function useSaga<TRes>(saga: ComponentSaga<[], TRes>): UseSagaOutput<TRes, []>;
export function useSaga<TArgs extends any[], TRes>(
    saga: ComponentSaga<TArgs, TRes>,
    args: TArgs,
    options?: UseSagaOptions<TArgs, TRes>
): UseSagaOutput<TRes, TArgs>;

export function useSaga<TArgs extends any[], TRes>(
    saga: ComponentSaga<TArgs, TRes>,
    args: TArgs = [] as any as TArgs,
    options?: UseSagaOptions<TArgs, TRes>
) {
    const diContext = useDI();
    const disableSSR = useContext(DisableSsrContext);
    const uuidGen = diContext.getService(UUIDGenerator);

    const dispatch = useDispatch();
    const operationId = useMemo(function () {
        return uuidGen.uuid('operation');
    }, EMPTY_ARR) as OperationId<TRes, TArgs>;
    const [reloadCount, updateCounter] = useState(0);

    const forceReload = useCallback(
        function () {
            updateCounter(reloadCount + 1);
        },
        [reloadCount]
    );

    const service = diContext.getService(ComponentLifecycleService);
    const actions = diContext.createServiceActions(service);

    // reload on args changed
    useEffect(
        function load() {
            const loadId = uuidGen.uuid('load');
            dispatch(
                actions.load({
                    loadId,
                    operationId,
                    saga,
                    args,
                    options: options?.operationOptions,
                })
            );

            return function dispose() {
                dispatch(actions.dispose(loadId));
            };
        },
        [...args, reloadCount]
    );

    // remove underlying operation on unmount
    useEffect(function initClean() {
        return function clean() {
            dispatch(actions.cleanup({ operationId }));
        };
    }, EMPTY_ARR);

    if (isNodeEnv() && !disableSSR) {
        dispatch(
            actions.load({
                loadId: uuidGen.uuid('load'),
                operationId,
                saga,
                args,
                options: options?.operationOptions,
            })
        );
    }

    return { operationId, reload: forceReload };
}
