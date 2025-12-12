import { createContext } from 'react';

import { Ctr, CtrWithInject, DependencyKey, InjectionKey } from './types';
import { Dependency } from './services/Dependency';
import { serviceActionsFactory } from './services';

const EMPTY_ARR: Ctr<Dependency>[] = [];

export type SagaClientHash = Record<
    string,
    {
        args: any[];
        result: any;
    }
>;

export const DisableSsrContext = createContext<boolean>(false);

export type IDIContext = {
    registerDependency<D>(key: DependencyKey<D>, dependency: D): void;
    unregisterDependency<D>(key: DependencyKey<D>): void;
    getDependency<D>(key: DependencyKey<D>): D;
    registerService: (service: Dependency) => void;
    unregisterService: <T extends Dependency>(Ctr: Ctr<T>) => void;
    createService: <T extends Dependency>(Ctr: Ctr<T>) => T;
    getService: <T extends Dependency>(Ctr: Ctr<T>) => T;
    createServiceActions: ReturnType<typeof serviceActionsFactory>;
};

export type IDIContextFactory = () => IDIContext;

export const getDIContext: IDIContextFactory = () => {
    const container = {} as Record<string, any>;
    const createServiceActions = serviceActionsFactory();

    function registerDependency<D>(key: DependencyKey<D>, dependency: D) {
        if (container[key]) {
            return;
        }

        container[key] = dependency;
    }

    function unregisterDependency<D>(key: DependencyKey<D>) {
        delete container[key];
    }

    function getDependency<D>(key: DependencyKey<D>): D {
        const record = container[key];

        if (!record) {
            throw new Error(`Register dependency first by key ${key}`);
        }

        return record;
    }

    const context: IDIContext = {
        registerDependency,
        unregisterDependency,
        getDependency,
        registerService(service) {
            registerDependency(service.toString() as DependencyKey<Dependency>, service);
        },
        unregisterService<T extends Dependency>(Ctr: Ctr<T>) {
            unregisterDependency(Ctr.prototype.toString() as DependencyKey<Dependency>);
        },
        getService<T extends Dependency>(Ctr: Ctr<T>) {
            return getDependency(Ctr.prototype.toString());
        },
        createService<T extends Dependency>(Ctr: CtrWithInject<T>) {
            const key = Ctr.prototype.toString();
            if (container[key]) {
                return container[key] as T;
            }

            let metaTarget = Ctr;
            let meta: InjectionKey[] | undefined;

            while (metaTarget) {
                meta = metaTarget.__injects;
                if (meta) break;

                metaTarget = Object.getPrototypeOf(metaTarget);
            }

            function depMap(key: InjectionKey) {
                return typeof key === 'function' ? context.getService(key) : getDependency(key);
            }

            return new Ctr(...(meta || EMPTY_ARR).map(depMap));
        },
        createServiceActions,
    };

    return context;
};

export const DIContext = createContext<IDIContext | null>(null);
