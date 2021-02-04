import { call, fork, put, take } from 'typed-redux-saga';
import { Indexed } from '@iiiristram/ts-type-utils';

import { daemon, DaemonMode } from '../decorators';
import { emptyFlow } from '../utils/emptyFlow';
import { isNodeEnv } from '../utils/isNodeEnv';
import { OperationCreationOptions } from '../types';
import { Service } from './Service';

export type LoadOptions<TArgs extends any[], TRes> = OperationCreationOptions<TRes, TArgs> & {
    loadId: string;
};

type DisposeAction = {
    type: typeof DISPOSE_SIGNAL;
    payload: string;
};

const DISPOSE_SIGNAL = 'DISPOSE_SIGNAL' as const;

function isDisposeSignal(loadId: string) {
    return function disposePattern({ type, payload }: DisposeAction) {
        return type === DISPOSE_SIGNAL && payload === loadId;
    };
}

export class ComponentLifecycleService extends Service {
    toString() {
        return 'ComponentLifecycleService';
    }

    private EXECUTION_MAP: Indexed<LoadOptions<any[], any> | undefined> = {};

    @daemon(DaemonMode.Every)
    *load<TArgs extends any[]>(options: LoadOptions<TArgs, any>) {
        const { operationId } = options;
        if (!this.EXECUTION_MAP[operationId] && !isNodeEnv()) {
            yield* call(this._operationsService.registerConsumer, this, operationId);
        }

        let next = this.EXECUTION_MAP[operationId];
        this.EXECUTION_MAP[operationId] = options;

        if (next) {
            return;
        }

        while (this.EXECUTION_MAP[operationId] && next !== this.EXECUTION_MAP[operationId]) {
            next = this.EXECUTION_MAP[operationId];

            if (next) {
                const { loadId, saga, args, operationId, options } = next;
                const { onLoad = emptyFlow, onDispose = emptyFlow } = saga;

                const loadOperation = this._operationsService.createOperation({
                    operationArgs: [operationId, onLoad, options?.updateStrategy],
                });

                const loadTask = yield* fork(loadOperation.run, ...args);

                yield* take(isDisposeSignal(loadId));
                loadTask.cancel();

                yield* call(onDispose, ...args);
            }
        }

        this.EXECUTION_MAP[operationId] = undefined;
    }

    @daemon(DaemonMode.Every)
    *dispose(id: string) {
        yield* put({ type: DISPOSE_SIGNAL, payload: id });
    }

    @daemon(DaemonMode.Every)
    *cleanup({ operationId }: { operationId: string }) {
        this.EXECUTION_MAP[operationId] = undefined;
        yield* call(this._operationsService.unregisterConsumer, this, operationId);
    }
}
