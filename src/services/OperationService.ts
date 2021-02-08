import { apply, call } from 'typed-redux-saga';
import { ExtractArgs, Indexed } from '@iiiristram/ts-type-utils';

import { createDeferred, Deferred } from '../utils/createDeferred';
import { daemon, DaemonMode } from '../decorators';
import { Gen, Saga } from '../types';
import { assertNullable } from '../utils/assertNullable';
import { BaseService } from './BaseService';
import { createOperation } from '../utils/createOperation';
import { emptyFlow } from '../utils/emptyFlow';
import { isNodeEnv } from '../utils/isNodeEnv';
import { SagaClientHash } from '../context';

export class OperationService extends BaseService {
    toString() {
        return 'OperationService';
    }

    private _hash: SagaClientHash | undefined;
    private _operations: Indexed<ReturnType<typeof createOperation> | undefined> = {};
    private _operationConsumers: Indexed<Set<object>> = {};
    private _consumerOperations = new WeakMap<object, Indexed<string>>();
    private _operationSubscriptions: Indexed<Deferred<unknown> | undefined> = {};

    private createSubscription<TArgs extends any[], TRes>(id: string, run: Saga<TArgs, TRes>) {
        const self = this;
        return function* subscription(...args: TArgs): Gen<TRes> {
            let error: Error | undefined = undefined;
            let result: TRes | undefined = undefined;

            self._operationSubscriptions[id] = self._operationSubscriptions[id] || createDeferred<unknown>();
            const defer = self._operationSubscriptions[id];

            try {
                result = (yield* apply(this, run, args)) as TRes;
            } catch (e) {
                error = e;
                throw e;
            } finally {
                if (error) {
                    defer?.reject(error);
                } else {
                    defer?.resolve(result);
                }

                self._operationSubscriptions[id] = undefined;
            }

            return result;
        };
    }

    constructor(options?: { hash?: SagaClientHash }) {
        super();
        this._hash = options?.hash;
    }

    createOperation({
        operationArgs,
        ssr = false,
    }: {
        operationArgs: ExtractArgs<typeof createOperation>;
        ssr?: boolean;
    }) {
        const self = this;
        const id = operationArgs[0];
        const isNode = isNodeEnv();

        const operation = createOperation.apply(null, operationArgs);

        const originRun = operation.run;
        operation.run = this.createSubscription(id, function* (...args: any[]) {
            if (!isNode) {
                if (self._hash?.[id]) {
                    const { args: ssrArgs, result } = self._hash[id];

                    const sameArgs =
                        ssrArgs.length === args.length &&
                        ssrArgs.every(function (arg, i) {
                            return ssrArgs[i] === args[i];
                        });

                    delete self._hash[id];

                    if (sameArgs) {
                        return result;
                    }
                }
            }

            const result = yield* apply(this, originRun, args);

            if (isNode && ssr && self._hash) {
                self._hash[id] = { args, result };
            }

            return result;
        });

        this._operations[id] = operation;
        return operation;
    }

    getHash() {
        return this._hash;
    }

    subscribeOperation(operationId: string) {
        const defer = this._operationSubscriptions[operationId] || createDeferred<unknown>();
        this._operationSubscriptions[operationId] = defer;
        return defer.promise;
    }

    @daemon(DaemonMode.Every)
    *registerConsumer(consumer: object, operationId: string) {
        if (!this._consumerOperations.has(consumer)) {
            this._consumerOperations.set(consumer, {});
        }

        const operations = this._consumerOperations.get(consumer);
        assertNullable(operations);

        operations[operationId] = operationId;
        this._operationConsumers[operationId] = this._operationConsumers[operationId] || new Set<object>();
        this._operationConsumers[operationId].add(consumer);
    }

    @daemon(DaemonMode.Every)
    *unregisterConsumer(consumer: object, operationId?: string) {
        const operations = this._consumerOperations.get(consumer);

        if (operations) {
            if (operationId) {
                delete operations[operationId];
            } else {
                this._consumerOperations.delete(consumer);
            }
        }

        const operationsToDestroy = operationId ? [operationId] : operations ? Object.keys(operations) : [];

        if (!operationsToDestroy?.length) {
            return;
        }

        for (const o of operationsToDestroy) {
            this._operationConsumers[o].delete(consumer);

            if (this._operationConsumers[o].size === 0) {
                delete this._operationConsumers[o];
                yield* call(this._operations[o]?.destroy || emptyFlow);
            }
        }
    }
}
