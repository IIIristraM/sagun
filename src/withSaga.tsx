import React, { SuspenseProps, useContext, useMemo } from 'react';

import { ActionAPI, AsyncOperation, ComponentSaga, OperationId } from './types';
import { DisableSsrContext, IDIContext } from './context';
import { useOperation, useServiceConsumer } from './hooks';
import { useSaga, UseSagaOptions } from './hooks/useSaga';
import { isNodeEnv } from './utils/isNodeEnv';
import { Service } from './services';
import { Suspense } from './components/Suspense';
import { useDI } from './hooks/useDI';
import { useService } from './hooks/useService';

type WithSagaProp<P extends object, TRes, TArgs extends any[]> = P & {
    operation: Partial<AsyncOperation<TRes, TArgs>>;
};

type WithServiceProp<P extends object, TRes, TArgs extends any[], TServ extends Service<TArgs, TRes>> = WithSagaProp<
    P,
    TRes,
    TArgs
> & {
    service: TServ;
    actions: ActionAPI<TServ>;
};

type OuterProps<P> = P & {
    fallback?: SuspenseProps['fallback'];
};

type ArgsMapper<P extends object, TArgs extends any[]> = (props: P) => TArgs;

function Operation<TRes, TArgs>({
    children,
    operationId,
}: {
    operationId: OperationId<TRes, TArgs>;
    children: (operation: Partial<AsyncOperation<TRes, TArgs>>) => React.ReactNode;
}) {
    const disableSSR = useContext(DisableSsrContext);
    const operation = useOperation({ operationId, suspense: disableSSR ? !isNodeEnv() : true });

    return <>{children(operation)}</>;
}

export function withSaga<TRes>(options: {
    sagaFactory: (context: IDIContext) => ComponentSaga<[], TRes>;
    options?: UseSagaOptions<[], TRes>;
}): <P extends object>(Component: React.ComponentType<WithSagaProp<P, TRes, []>>) => React.FC<OuterProps<P>>;

export function withSaga<P extends object, TRes, TArgs extends any[]>(options: {
    sagaFactory: (context: IDIContext) => ComponentSaga<TArgs, TRes>;
    argsMapper: ArgsMapper<P, TArgs>;
    options?: UseSagaOptions<TArgs, TRes>;
}): (Component: React.ComponentType<WithSagaProp<P, TRes, TArgs>>) => React.FC<OuterProps<P>>;

export function withSaga<P extends object, TRes, TArgs extends any[]>({
    sagaFactory,
    argsMapper = () => ([] as any) as TArgs,
    options,
}: {
    sagaFactory: (context: IDIContext) => ComponentSaga<TArgs, TRes>;
    argsMapper: ArgsMapper<P, TArgs>;
    options: UseSagaOptions<TArgs, TRes>;
}) {
    return (Component: React.ComponentType<WithSagaProp<P, TRes, TArgs>>) => {
        return function SagaBind(props: OuterProps<P>) {
            const { fallback, ...rest } = props;
            const diContext = useDI();
            const { operationId } = useSaga(sagaFactory(diContext), argsMapper(props), options);

            return (
                <Suspense fallback={fallback || null}>
                    <Operation operationId={operationId}>
                        {operation => <Component {...(rest as P)} operation={operation} />}
                    </Operation>
                </Suspense>
            );
        };
    };
}

export function withService<TRes, TServ extends Service<[], TRes>>(options: {
    serviceFactory: (context: Pick<IDIContext, 'getService' | 'createService'>) => TServ;
    options?: UseSagaOptions<[], TRes>;
}): <P extends object>(Component: React.ComponentType<WithServiceProp<P, TRes, [], TServ>>) => React.FC<OuterProps<P>>;

export function withService<P extends object, TRes, TArgs extends any[], TServ extends Service<TArgs, TRes>>(options: {
    serviceFactory: (context: Pick<IDIContext, 'getService' | 'createService'>) => TServ;
    argsMapper: ArgsMapper<P, TArgs>;
    options?: UseSagaOptions<TArgs, TRes>;
}): (Component: React.ComponentType<WithServiceProp<P, TRes, TArgs, TServ>>) => React.FC<OuterProps<P>>;

export function withService<P extends object, TRes, TArgs extends any[], TServ extends Service<TArgs, TRes>>({
    serviceFactory,
    argsMapper = () => ([] as any) as TArgs,
    options,
}: {
    serviceFactory: (context: Pick<IDIContext, 'getService' | 'createService'>) => TServ;
    argsMapper: ArgsMapper<P, TArgs>;
    options: UseSagaOptions<TArgs, TRes>;
}) {
    return (Component: React.ComponentType<WithServiceProp<P, TRes, TArgs, TServ>>) => {
        return function SagaBind(props: OuterProps<P>) {
            const { fallback, ...rest } = props;
            const diContext = useDI();

            const service = useMemo(() => serviceFactory(diContext), [diContext]);
            diContext.registerService(service);

            const { operationId } = useService(service, argsMapper(props), options);
            const { actions } = useServiceConsumer<typeof service>(service.constructor as any);

            return (
                <Suspense fallback={fallback || null}>
                    <Operation operationId={operationId}>
                        {operation => (
                            <Component {...(rest as P)} operation={operation} actions={actions} service={service} />
                        )}
                    </Operation>
                </Suspense>
            );
        };
    };
}
