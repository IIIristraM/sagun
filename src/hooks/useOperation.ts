import { useContext, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Indexed } from '@iiiristram/ts-type-utils';
import { NO_SSR } from 'react-async-ssr/symbols';

import { AsyncOperation, OperationId } from '../types';
import { DisableSsrContext } from '../context';
import { isNodeEnv } from '../utils/isNodeEnv';
import { OperationService } from '../services';
import { State } from '../reducer';
import { useDI } from './useDI';

type Path = (state: any) => State;

type UseOperationOptions<TRes, TArgs = any, TMeta = never, TErr = Error> = {
    operationId: OperationId<TRes, TArgs, TMeta, TErr>;
    defaultState?: Partial<AsyncOperation<TRes, TArgs, TMeta, TErr>>;
    suspense?: boolean;
};

const DEFAULTS = {
    suspense: false,
    defaultState: { isLoading: true },
};

let PATH: Path;
function getComponentId() {
    return {};
}

export const useOperation = Object.assign(
    function useOperation<TRes, TArgs = any, TMeta = never, TErr = Error>(
        options: UseOperationOptions<TRes, TArgs, TMeta, TErr>
    ) {
        const finalOptions = { ...DEFAULTS, ...options };
        const { operationId, defaultState, suspense } = finalOptions;
        const diContext = useDI();
        const disableSSR = useContext(DisableSsrContext);

        if (!PATH) {
            throw new Error('Set path to operations via useOperation.setPath first');
        }

        const dispatch = useDispatch();
        const service = diContext.getService(OperationService);
        const actions = diContext.createServiceActions(service);

        const componentId = useMemo(getComponentId, []);
        useEffect(function register() {
            if (service.getStatus() !== 'ready') {
                throw new Error(`OperationService should be run first`);
            }

            dispatch(actions.registerConsumer(componentId, operationId));

            return function unregister() {
                dispatch(actions.unregisterConsumer(componentId, operationId));
            };
        });

        const operation = useSelector(function getOperation(state: Indexed) {
            return ((PATH?.(state)?.get(operationId) ||
                defaultState ||
                {}) as any) as Partial<AsyncOperation<TRes, TArgs, TMeta, TErr>>;
        });

        if (!operation) {
            return operation;
        }

        const { isLoading, error } = operation;

        if (suspense && isLoading) {
            const promise = service.subscribeOperation(operationId);

            if (disableSSR && isNodeEnv()) {
                (promise as any)[NO_SSR] = true;
            }

            throw promise;
        }

        if (suspense && error) {
            throw error;
        }

        return operation;
    },
    {
        setPath: function (path: Path) {
            PATH = path;
        },
    }
);
