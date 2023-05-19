import { call } from 'typed-redux-saga';

import { IOperationUpdateStrategy, OperationId, ReplaceSaga } from '../types';
import { createActionType } from '../utils/createActions';
import { inheritDescriptor } from './inheritDescriptor';
import { Service } from '../services';

function isStringId<TRes, TArgs extends any[]>(id: any): id is OperationId<TRes, TArgs> {
    return typeof id === 'string';
}

function createDescriptor<TRes, TArgs extends any[]>(options: {
    target: any;
    key: string;
    descriptor: PropertyDescriptor;
    operationOptions?: {
        id?: OperationId<TRes, TArgs> | ((...args: TArgs) => OperationId<TRes, TArgs>);
        updateStrategy?: IOperationUpdateStrategy<TRes, TArgs>;
        ssr?: boolean;
    };
}): PropertyDescriptor {
    const { target, key, descriptor, operationOptions } = options;
    const { updateStrategy, id, ssr } = operationOptions || {};

    const origin = descriptor.value;
    const operationId = id || (createActionType(target.toString(), key) as OperationId<TRes, TArgs>);
    descriptor.value.destroy = {} as Record<string, string>;

    if (isStringId(operationId)) {
        // WARNING: внешняя операция скроет под собой внутренние
        origin.id = operationId;
    }

    function* operationWrapper(this: Service, ...args: TArgs) {
        if (!this?._operationsService) {
            throw new Error('Custom services have to be inherited from "Service" class');
        }

        const id = isStringId(operationId) ? operationId : operationId(...args);
        const uniqId = id; // isStringId(operationId) ? (`${id}_${this.getUUID()}` as typeof id) : id;

        const operation = this._operationsService.createOperation({
            operationArgs: [uniqId, origin, updateStrategy],
            ssr: !!ssr,
        });

        yield* call(this._operationsService.registerConsumer, this, uniqId);

        return yield* call([this, operation.run], ...args);
    }

    return inheritDescriptor(descriptor, operationWrapper);
}

export function operation(target: any, key: string, descriptor: PropertyDescriptor): PropertyDescriptor;

export function operation<TRes, TArgs extends any[] = any>(options: {
    id?: OperationId<TRes, TArgs> | ((...args: TArgs) => OperationId<TRes, TArgs>);
    ssr?: boolean;
    updateStrategy: IOperationUpdateStrategy<TRes, TArgs>;
}): <TVal>(
    target: any,
    key: string,
    descriptor: TypedPropertyDescriptor<TVal>
) => TypedPropertyDescriptor<ReplaceSaga<TVal, TArgs, TRes>>;

export function operation<TRes, TArgs extends any[] = any>(
    options:
        | OperationId<TRes, TArgs>
        | ((...args: TArgs) => OperationId<TRes, TArgs>)
        | {
              id: OperationId<TRes, TArgs> | ((...args: TArgs) => OperationId<TRes, TArgs>);
              ssr?: boolean;
          }
): <TVal extends (...args: any) => any>(
    target: any,
    key: string,
    descriptor: TypedPropertyDescriptor<TVal>
) => TypedPropertyDescriptor<ReplaceSaga<TVal, TArgs, TRes>>;

export function operation(options: {
    ssr: boolean;
}): (target: any, key: string, descriptor: PropertyDescriptor) => PropertyDescriptor;

export function operation(...args: any[]) {
    if (args.length === 1) {
        const operationOptions = ['object'].includes(typeof args[0])
            ? args[0]
            : ['function', 'string'].includes(typeof args[0])
            ? { id: args[0] }
            : null;

        if (!operationOptions) {
            throw new Error('Unexpected arguments');
        }

        return function operationDesc(target: any, key: string, descriptor: PropertyDescriptor) {
            return createDescriptor({ target, key, descriptor, operationOptions });
        };
    }

    const [target, key, descriptor] = args;
    return createDescriptor({ target, key, descriptor });
}
