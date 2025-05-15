import { Exact, ExtractByType, ReplaceReturn } from '@iiiristram/ts-type-utils';
import Redux from 'redux';

export type Action<P, T = string> = Redux.Action<T> & {
    payload?: P;
};

export interface ActionCreator<P, T = any> {
    (...args: any[]): Action<P, T>;
    method?: string;
}

export type ActionAPI<T> = {
    [K in keyof (ExtractByType<T, Saga> & ExtractByType<T, NoYieldSaga>)]: ReplaceReturn<
        T[K],
        T[K] extends (...args: any) => any ? Action<Parameters<T[K]>> : never
    >;
};

export type ResolveActionCreator<P, T> =
    Exact<P, never> extends true ? () => Action<never, T> : (payload: P) => Action<P, T>;

export type AsyncOperation<TRes = unknown, TArgs = unknown[], TMeta = unknown, TErr = Error> = {
    id: OperationId<TRes, TArgs, TMeta, TErr>;
    isLoading?: boolean;
    isError?: boolean;
    isBlocked?: boolean;
    error?: TErr;
    args?: TArgs;
    result?: TRes;
    meta?: TMeta;
};

declare class OperationMetaClass<TRes, TArgs, TMeta, TErr> {
    private _res: TRes;
    private _args: TArgs;
    private _meta: TMeta;
    private _err: TErr;
}

export type OperationId<TRes, TArgs = unknown[], TMeta = unknown, TErr = Error> = string &
    OperationMetaClass<TRes, TArgs, TMeta, TErr>;

export type OperationFromId<T> =
    T extends OperationId<infer R, infer A, infer M, infer E> ? AsyncOperation<R, A, M, E> : never;

declare class DependencyMetaClass<D> {
    private _type: D;
}

export type DependencyKey<D> = string & DependencyMetaClass<D>;

export type Gen<R = any> = Generator<any, R, any>;

export type Saga<TArgs extends any[] | readonly any[] = any[], TRes = any> = (...args: TArgs) => Gen<TRes>;
export type NoYieldSaga<TArgs extends any[] = any[], TRes = any> = (...args: TArgs) => Generator<never, TRes, any>;

export type ReplaceSaga<T, TArgs extends any[] = any[], TRes = any> = T extends (
    ...args: any
) => Generator<infer Y, any, infer N>
    ? (...args: TArgs) => Generator<Y, TRes, N>
    : never;

export type Callable<TArgs extends any[] = any[], TRes = any> =
    | ((...args: TArgs) => Promise<TRes>)
    | Saga<TArgs, TRes>
    | ((...args: TArgs) => TRes);

export type CallEffectTarget<TArgs extends any[] = any[], TRes = any> =
    | Callable<TArgs, TRes>
    | [this: object, method: Callable<TArgs, TRes>];

export type ExtractOperation<T> = T extends Saga<infer TArgs, infer TRes> ? OperationId<TRes, TArgs> : string;

export type ServiceMethod<T> = T & { id?: ExtractOperation<T> };

export type ComponentSaga<TArgs extends any[] | readonly any[], TRes> = {
    id?: string;
    onLoad?: Saga<TArgs, TRes>;
    onDispose?: Saga<TArgs>;
};

export type ComponentSagaSafe<TArgs extends any[] | readonly any[], TRes> = {
    id: string;
    onLoad?: Saga<TArgs, TRes>;
    onDispose?: Saga<TArgs>;
};

export type IOperationUpdateStrategy<TRes, TArgs extends any[] | readonly any[]> = Callable<
    [AsyncOperation<TRes, TArgs>],
    AsyncOperation<TRes, TArgs>
>;

export type OperationCreationOptions<TRes, TArgs extends any[] | readonly any[]> = {
    operationId: OperationId<TRes, TArgs>;
    saga: ComponentSaga<TArgs, TRes>;
    args: TArgs;
    options?: {
        updateStrategy: IOperationUpdateStrategy<TRes, TArgs>;
    };
};

export type Ctr<T> = new (...args: any) => T;

export type InjectionKey = Ctr<any> | DependencyKey<any>;

export type CtrWithInject<T> = Ctr<T> & { __injects?: InjectionKey[] };
