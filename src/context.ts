import 'reflect-metadata';
import { createContext } from 'react';
import { Indexed } from '@iiiristram/ts-type-utils';

import { BaseService } from './services/BaseService';

export type SagaClientHash = Indexed<{
    args: any[];
    result: any;
}>;

export const DisableSsrContext = createContext<boolean>(false);

export type IDIContext = {
    registerService: (service: BaseService<any, any>) => void;
    createService: <T extends BaseService<any, any>>(Ctr: new (...args: any) => T) => T;
    getService: <T extends BaseService<any, any>>(Ctr: new (...args: any) => T) => T;
};

export type IDIContextFactory = () => IDIContext;

export const getDIContext: IDIContextFactory = () => {
    const container = new WeakMap<Function, BaseService<any[], any>>();

    const context: IDIContext = {
        registerService(service) {
            if (container.has(service.constructor)) {
                return;
            }

            container.set(service.constructor, service);
        },
        getService<T extends BaseService<any, any>>(Ctr: new (...args: any) => T) {
            const record = container.get(Ctr);

            if (!record) {
                throw new Error(`Register service first ${Ctr.name}`);
            }

            return (record as any) as T;
        },
        createService<T extends BaseService<any, any>>(Ctr: new (...args: any) => T) {
            if (container.has(Ctr)) {
                return container.get(Ctr) as T;
            }

            let metaTarget = Ctr;
            let meta: any[] | undefined;
            while (metaTarget) {
                meta = Reflect.getOwnMetadata('design:paramtypes', metaTarget);
                if (meta) break;

                metaTarget = Object.getPrototypeOf(metaTarget);
            }

            const serviceDeps = (meta || []).filter((dep: any) => dep.prototype instanceof BaseService);

            const args = serviceDeps.map((i: any) => context.getService(i));

            return new Ctr(...args);
        },
    };

    return context;
};

export const DIContext = createContext<IDIContext | null>(null);
