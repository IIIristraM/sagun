import { call, fork, put, take } from 'typed-redux-saga';

import { daemon, DaemonMode } from '../decorators';
import { emptyFlow } from '../utils/emptyFlow';
import { isNodeEnv } from '../utils/isNodeEnv';
import { OperationCreationOptions } from '../types';
import { Service } from './Service';
import { UUIDGenerator } from './UUIDGenerator';

export type LoadOptions<TArgs extends any[] | readonly any[], TRes> = OperationCreationOptions<TRes, TArgs> & {
    loadId?: string;
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

    private uuidGen = new UUIDGenerator();
    private NEXT_EXECUTION_MAP: Record<string, LoadOptions<any[], any> | undefined> = {};
    private CURRENT_EXECUTION_MAP: Record<string, LoadOptions<any[], any> | undefined> = {};

    @daemon(DaemonMode.Every)
    *load(loadOperationId: string) {
        if (!this.CURRENT_EXECUTION_MAP[loadOperationId] && !isNodeEnv()) {
            yield* call(this._operationsService.registerConsumer, this, loadOperationId);
        }

        if (this.CURRENT_EXECUTION_MAP[loadOperationId]) {
            const loadId = this.CURRENT_EXECUTION_MAP[loadOperationId].loadId;
            yield* put({ type: DISPOSE_SIGNAL, payload: loadId! });
            return;
        }

        while (
            this.NEXT_EXECUTION_MAP[loadOperationId] &&
            this.CURRENT_EXECUTION_MAP[loadOperationId] !== this.NEXT_EXECUTION_MAP[loadOperationId]
        ) {
            const next = this.NEXT_EXECUTION_MAP[loadOperationId];
            const { loadId, saga, args, operationId, options } = next;

            this.CURRENT_EXECUTION_MAP[operationId] = next;

            const { onLoad = emptyFlow, onDispose = emptyFlow } = saga;

            const loadOperation = this._operationsService.createOperation({
                operationArgs: [operationId, onLoad, options?.updateStrategy],
                ssr: false,
            });

            const loadTask = yield* fork(loadOperation.run, ...args);
            yield* take(isDisposeSignal(loadId!));

            loadTask.cancel();
            yield* call(onDispose, ...args);
        }

        this.NEXT_EXECUTION_MAP[loadOperationId] = undefined;
        this.CURRENT_EXECUTION_MAP[loadOperationId] = undefined;
    }

    getCurrentExecution(operationId: string) {
        return this.CURRENT_EXECUTION_MAP[operationId] ?? this.NEXT_EXECUTION_MAP[operationId];
    }

    scheduleExecution<TArgs extends any[]>(options: LoadOptions<TArgs, any>) {
        options.loadId = this.uuidGen.uuid('load');
        this.NEXT_EXECUTION_MAP[options.operationId] = options;
    }

    @daemon(DaemonMode.Every)
    *cleanup({ operationId }: { operationId: string }) {
        const loadId = this.getCurrentExecution(operationId)?.loadId;
        this.CURRENT_EXECUTION_MAP[operationId] = undefined;
        this.NEXT_EXECUTION_MAP[operationId] = undefined;
        if (loadId) {
            yield* put({ type: DISPOSE_SIGNAL, payload: loadId });
            yield* call(this._operationsService.unregisterConsumer, this, operationId);
        }
    }
}
