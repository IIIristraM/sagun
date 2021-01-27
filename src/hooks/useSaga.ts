import { useCallback, useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { ComponentLifecycleService, createServiceActions, LoadOptions } from '../services';
import { ComponentSaga, OperationId } from '../types';
import { DisableSsrContext, SsrContext } from '../context';
import { isNodeEnv } from '../utils/isNodeEnv';
import { useDI } from './useDI';
import { useOperationId } from './useOperationId';
import { uuid } from '../utils/uuid';

export type UseSagaOptions<TArgs extends any[], TRes> = {
    operationOptions?: LoadOptions<TArgs, TRes>['options'];
};

export type UseSagaOutput<TRes, TArgs> = {
    operationId: OperationId<TRes, TArgs>;
    reload: () => void;
};

export function useSaga<TRes>(saga: ComponentSaga<[], TRes>): UseSagaOutput<TRes, []>;
export function useSaga<TArgs extends any[], TRes>(
    saga: ComponentSaga<TArgs, TRes>,
    args: TArgs,
    options?: UseSagaOptions<TArgs, TRes>
): UseSagaOutput<TRes, TArgs>;

export function useSaga<TArgs extends any[], TRes>(
    saga: ComponentSaga<TArgs, TRes>,
    args: TArgs = ([] as any) as TArgs,
    options?: UseSagaOptions<TArgs, TRes>
) {
    const diContext = useDI();

    const dispatch = useDispatch();
    const disableSSR = useContext(DisableSsrContext);
    const context = disableSSR === true ? null : useContext(SsrContext);
    const operationId = useOperationId<OperationId<TRes, TArgs>>(context);
    const [reloadCount, updateCounter] = useState(0);

    const forceReload = useCallback(() => {
        updateCounter(reloadCount + 1);
    }, [reloadCount]);

    const service = diContext.getService(ComponentLifecycleService);
    const actions = createServiceActions(service);

    // reload on args changed
    useEffect(() => {
        const loadId = uuid();
        dispatch(
            actions.load({
                loadId,
                operationId,
                saga,
                args,
                options: options?.operationOptions,
            })
        );

        return () => {
            dispatch(actions.dispose(loadId));
        };
    }, [...args, reloadCount]);

    // remove underlying operation on unmount
    useEffect(() => {
        return () => {
            dispatch(actions.cleanup({ operationId }));
        };
    }, []);

    if (isNodeEnv() && context) {
        dispatch(
            actions.load({
                loadId: uuid(),
                operationId,
                saga,
                args,
                options: options?.operationOptions,
            })
        );
    }

    return { operationId, reload: forceReload };
}
