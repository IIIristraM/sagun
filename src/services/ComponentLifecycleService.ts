import { call, spawn } from 'typed-redux-saga';
import { Task } from 'redux-saga';

import { daemon, DaemonMode } from '../decorators';
import { createDeferred } from '../utils/createDeferred';
import { emptyFlow } from '../utils/emptyFlow';
import { isNodeEnv } from '../utils/isNodeEnv';
import { OperationCreationOptions } from '../types';
import { Service } from './Service';

export type LoadOptions<TArgs extends any[] | readonly any[], TRes> = Omit<
    OperationCreationOptions<TRes, TArgs>,
    'args'
> & {
    args?: TArgs;
    loadId: string;
    _failed?: boolean;
};

const EMPTY_ARGS: any[] = [];

export class ComponentLifecycleService extends Service {
    toString() {
        return 'ComponentLifecycleService';
    }

    private NEXT_EXECUTION_MAP: Record<string, LoadOptions<any[], any> | undefined> = {};
    private CURRENT_EXECUTION_MAP: Record<string, LoadOptions<any[], any> | undefined> = {};
    private DISPOSE_SIGNAL_MAP: Record<string, AbortController | undefined> = {};
    private TASKS = new Set<Task>();

    @daemon(DaemonMode.Every)
    *load(loadOperationId: string, loadId: string) {
        if (!this.CURRENT_EXECUTION_MAP[loadOperationId] && !isNodeEnv()) {
            yield* call(this._operationsService.registerConsumer, this, loadOperationId);
        }

        if (
            this.NEXT_EXECUTION_MAP[loadOperationId]?.loadId !== loadId ||
            this.CURRENT_EXECUTION_MAP[loadOperationId]?.loadId === loadId
        ) {
            return;
        }

        const currentAbortController = this.DISPOSE_SIGNAL_MAP[loadOperationId];
        if (currentAbortController && !currentAbortController.signal.aborted) {
            this.disposeSignal(loadOperationId);
            return;
        }

        while (
            this.NEXT_EXECUTION_MAP[loadOperationId] &&
            this.CURRENT_EXECUTION_MAP[loadOperationId] !== this.NEXT_EXECUTION_MAP[loadOperationId]
        ) {
            const next = this.NEXT_EXECUTION_MAP[loadOperationId];
            const { saga, args = EMPTY_ARGS, operationId, options } = next;

            this.CURRENT_EXECUTION_MAP[operationId] = next;
            const disposePromise = this.waitDisposeSignal(operationId);

            const { onLoad = emptyFlow, onDispose = emptyFlow } = saga;

            const loadOperation = this._operationsService.createOperation({
                operationArgs: [operationId, onLoad, options?.updateStrategy],
                ssr: false,
            });

            let loadTask: Task | undefined;
            let disposed = false;
            try {
                loadTask = yield* spawn(loadOperation.run, ...args);
                this.TASKS.add(loadTask);

                yield disposePromise;
                disposed = true;
            } finally {
                if (!disposed) {
                    yield disposePromise;
                }

                if (loadTask) {
                    loadTask.cancel();
                    this.TASKS.delete(loadTask);
                }

                yield* call(onDispose, ...args);
            }
        }

        this.CURRENT_EXECUTION_MAP[loadOperationId] = undefined;
        this.DISPOSE_SIGNAL_MAP[loadOperationId] = undefined;
        this.NEXT_EXECUTION_MAP[loadOperationId] = undefined;
    }

    scheduleLoad(operationId: string, loadOptions: LoadOptions<any[], any>) {
        this.NEXT_EXECUTION_MAP[operationId] = loadOptions;
    }

    getCurrentExecution(operationId: string) {
        return this.CURRENT_EXECUTION_MAP[operationId] ?? this.NEXT_EXECUTION_MAP[operationId];
    }

    disposeSignal(operationId: string) {
        this.DISPOSE_SIGNAL_MAP[operationId]?.abort();
        this.DISPOSE_SIGNAL_MAP[operationId] = new AbortController();
    }

    waitDisposeSignal(operationId: string) {
        this.DISPOSE_SIGNAL_MAP[operationId] = this.DISPOSE_SIGNAL_MAP[operationId] || new AbortController();
        const ac = this.DISPOSE_SIGNAL_MAP[operationId];

        const deferred = createDeferred<string>();
        if (!ac || ac.signal.aborted) {
            deferred.resolve();
        } else {
            ac.signal.addEventListener('abort', () => {
                deferred.resolve();
            });
        }

        return deferred.promise;
    }

    @daemon(DaemonMode.Every)
    *cleanup({ operationId }: { operationId: string }) {
        this.disposeSignal(operationId);
        this.CURRENT_EXECUTION_MAP[operationId] = undefined;
        this.NEXT_EXECUTION_MAP[operationId] = undefined;

        if (!isNodeEnv()) {
            yield* call(this._operationsService.unregisterConsumer, this, operationId);
        }
    }

    *destroy() {
        yield* call([this, super.destroy]);
        Array.from(this.TASKS).forEach(task => task.cancel());
    }
}
