import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { ComponentLifecycleService, LoadOptions } from '../services';
import { ComponentSaga, ComponentSagaSafe, OperationId } from '../types';
import { DisableSsrContext } from '../context';
import { isNodeEnv } from '../utils/isNodeEnv';
import { useDI } from './useDI';
import { UUIDGenerator } from '../services/UUIDGenerator';

export type UseSagaOptions<TArgs extends any[] | readonly any[], TRes> = {
    operationOptions?: LoadOptions<TArgs, TRes>['options'];
};

export type UseSagaOutput<TRes, TArgs> = {
    operationId: OperationId<TRes, TArgs>;
    reload: () => void;
};

const EMPTY_ARR = [] as any[];
const loadTimeoutMap = new Map<string, any>();

/**
 * @deprecated
 */
export function useSagaUnsafe<TRes>(saga: ComponentSaga<[], TRes>): UseSagaOutput<TRes, []>;
/**
 * @deprecated
 */
export function useSagaUnsafe<TArgs extends any[] | readonly any[], TRes>(
    saga: ComponentSaga<TArgs, TRes>,
    args: TArgs,
    options?: UseSagaOptions<TArgs, TRes>
): UseSagaOutput<TRes, TArgs>;
/**
 * @deprecated
 */
export function useSagaUnsafe<TArgs extends any[], TRes>(
    saga: ComponentSaga<TArgs, TRes>,
    args: TArgs = [] as any as TArgs,
    options?: UseSagaOptions<TArgs, TRes>
) {
    const diContext = useDI();
    const disableSSR = useContext(DisableSsrContext);
    const uuidGen = diContext.getService(UUIDGenerator);
    const service = diContext.getService(ComponentLifecycleService);
    const actions = diContext.createServiceActions(service);

    const dispatch = useDispatch();
    const [reloadCount, updateCounter] = useState(0);
    const prevReload = useRef(reloadCount);

    const operationId = useMemo(
        function () {
            // https://github.com/facebook/react/issues/24669
            return saga.id ?? uuidGen.uuid('operation');
        },
        saga.id ? [saga.id] : EMPTY_ARR
    ) as OperationId<TRes, TArgs>;

    const forceReload = useCallback(
        function () {
            updateCounter(reloadCount + 1);
        },
        [reloadCount]
    );

    function reloadSaga() {
        if (isNodeEnv() && disableSSR) {
            return;
        }

        const currentExecution = service.getCurrentExecution(operationId);

        const isSameArgs =
            prevReload.current === reloadCount &&
            currentExecution?.args?.length === args.length &&
            currentExecution?.args?.every((val, index) => args[index] === val);

        // restore after Suspense resolved
        if (isSameArgs) {
            return;
        }

        const loadOptions: LoadOptions<TArgs, TRes> = {
            operationId: operationId as OperationId<TRes, TArgs>,
            saga,
            args,
            options: options?.operationOptions,
            loadId: uuidGen.uuid('load'),
        };

        const timer = loadTimeoutMap.get(operationId);
        if (timer) {
            (typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : clearTimeout)(timer);
            loadTimeoutMap.delete(operationId);
        }

        prevReload.current = reloadCount;

        function load() {
            dispatch(actions.load(operationId, loadOptions.loadId));
        }

        service.scheduleLoad(operationId, loadOptions);
        loadTimeoutMap.set(
            operationId,
            typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(load) : setTimeout(load, 0)
        );
    }

    // initial load.
    // useMemo cause starting from React v18 Suspense changes behavior,
    // so useEffect no longer called on Suspense children
    useMemo(reloadSaga, [...args, reloadCount, operationId]);

    // next loads on args changed or force reload
    useEffect(reloadSaga, [...args, reloadCount, operationId]);

    // remove underlying operation on unmount
    useEffect(function initClean() {
        return function clean() {
            const timer = loadTimeoutMap.get(operationId);
            if (timer) {
                (typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : clearTimeout)(timer);
                loadTimeoutMap.delete(operationId);
            }

            dispatch(actions.cleanup({ operationId }));
        };
    }, EMPTY_ARR);

    return { operationId, reload: forceReload };
}

export function useSaga<TRes>(saga: ComponentSagaSafe<[], TRes>): UseSagaOutput<TRes, []>;
export function useSaga<TArgs extends any[] | readonly any[], TRes>(
    saga: ComponentSagaSafe<TArgs, TRes>,
    args: TArgs,
    options?: UseSagaOptions<TArgs, TRes>
): UseSagaOutput<TRes, TArgs>;

export function useSaga<TArgs extends any[], TRes>(
    saga: ComponentSagaSafe<TArgs, TRes>,
    args: TArgs = [] as any as TArgs,
    options?: UseSagaOptions<TArgs, TRes>
) {
    return useSagaUnsafe(saga, args, options);
}
