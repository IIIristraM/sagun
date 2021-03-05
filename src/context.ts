import { createContext } from 'react';
import { Indexed } from '@iiiristram/ts-type-utils';

import { Ctr, CtrWithInject } from './types';
import { BaseService } from './services/BaseService';
import { Dependency } from './services/Dependency';
import { serviceActionsFactory } from './services';

const EMPTY_ARR: any[] = [];

export type SagaClientHash = Indexed<{
    args: any[];
    result: any;
}>;

export const DisableSsrContext = createContext<boolean>(false);

export type IDIContext = {
    registerService: (service: Dependency) => void;
    createService: <T extends Dependency>(Ctr: Ctr<T>) => T;
    getService: <T extends Dependency>(Ctr: Ctr<T>) => T;
    createServiceActions: ReturnType<typeof serviceActionsFactory>;
};

export type IDIContextFactory = () => IDIContext;

function serviceFilter(dep: any) {
    return dep.prototype instanceof BaseService;
}

export const getDIContext: IDIContextFactory = () => {
    const container = {} as Indexed<Dependency>;
    const createServiceActions = serviceActionsFactory();

    const context: IDIContext = {
        registerService(service) {
            const key = service.toString();
            if (container[key]) {
                return;
            }

            container[key] = service;
        },
        getService<T extends Dependency>(Ctr: Ctr<T>) {
            const record = container[Ctr.prototype.toString()];

            if (!record) {
                throw new Error(`Register service first ${Ctr.name}`);
            }

            return (record as any) as T;
        },
        createService<T extends Dependency>(Ctr: CtrWithInject<T>) {
            const key = Ctr.prototype.toString();
            if (container[key]) {
                return container[key] as T;
            }

            let metaTarget = Ctr;
            let meta: any[] | undefined;

            while (metaTarget) {
                meta = metaTarget.__injects;
                if (meta) break;

                metaTarget = Object.getPrototypeOf(metaTarget);
            }

            function depMap(i: any) {
                return context.getService(i);
            }

            const serviceDeps = (meta || EMPTY_ARR).filter(serviceFilter);
            const args = serviceDeps.map(depMap);

            return new Ctr(...args);
        },
        createServiceActions,
    };

    return context;
};

export const DIContext = createContext<IDIContext | null>(null);
