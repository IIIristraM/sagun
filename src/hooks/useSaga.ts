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
    const loadTimeout = useRef<any>(undefined);

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

    // initial load.
    // useMemo cause starting from React v18 Suspense changes behavior,
    // so useEffect no longer called on Suspense children
    useMemo(() => {
        if (isNodeEnv() && disableSSR) {
            return;
        }

        const currentExecution = service.getCurrentExecution(operationId);
        // restore after Suspense resolved
        if (
            currentExecution?.args.length === args.length &&
            currentExecution?.args.every((val, index) => args[index] === val)
        ) {
            return;
        }

        if (loadTimeout.current) {
            (typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : clearTimeout)(loadTimeout.current);
            loadTimeout.current = undefined;
        }

        service.scheduleExecution({
            operationId: operationId as OperationId<TRes, TArgs>,
            saga,
            args,
            options: options?.operationOptions,
        });

        if (typeof requestAnimationFrame !== 'undefined') {
            loadTimeout.current = requestAnimationFrame(() => {
                dispatch(actions.load(operationId));
            });
        } else {
            loadTimeout.current = setTimeout(() => {
                dispatch(actions.load(operationId));
            }, 0);
        }
    }, EMPTY_ARR);

    // next loads on args changed or force reload
    useEffect(
        function reloadSaga() {
            const currentExecution = service.getCurrentExecution(operationId);
            const isSameArgs =
                currentExecution?.args.length === args.length &&
                currentExecution?.args.every((val, index) => args[index] === val);

            // prevent double call in useMemo and useEffect on initialRender
            if (isSameArgs && prevReload.current === reloadCount) {
                return;
            }

            if (loadTimeout.current) {
                (typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : clearTimeout)(
                    loadTimeout.current
                );
                loadTimeout.current = undefined;
            }

            prevReload.current = reloadCount;
            service.scheduleExecution({
                operationId: operationId as OperationId<TRes, TArgs>,
                saga,
                args,
                options: options?.operationOptions,
            });
            dispatch(actions.load(operationId));
        },
        [...args, reloadCount, operationId]
    );

    // remove underlying operation on unmount
    useEffect(function initClean() {
        return function clean() {
            if (loadTimeout.current) {
                (typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : clearTimeout)(
                    loadTimeout.current
                );
                loadTimeout.current = undefined;
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
