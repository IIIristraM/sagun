import { call, fork, put, spawn, take } from 'typed-redux-saga';
import { Indexed } from '@iiiristram/ts-type-utils';
import { Task } from 'redux-saga';

import { daemon, DaemonMode } from '../decorators';
import { assertNullable } from '../utils/assertNullable';
import { emptyFlow } from '../utils/emptyFlow';
import { OperationCreationOptions } from '../types';
import { Service } from './Service';

export type LoadOptions<TArgs extends any[], TRes> = OperationCreationOptions<TRes, TArgs> & {
    loadId: string;
};

type ExecutionInfo<TArgs extends any[]> = {
    queue: Array<LoadOptions<TArgs, any>>;
};

type DisposeAction = {
    type: typeof DISPOSE_SIGNAL;
    payload: string;
};

const DISPOSE_SIGNAL = 'DISPOSE_SIGNAL' as const;

const isDisposeSignal = (loadId: string) => ({ type, payload }: DisposeAction) =>
    type === DISPOSE_SIGNAL && payload === loadId;

export class ComponentLifecycleService extends Service {
    toString() {
        return 'ComponentLifecycleService';
    }

    private EXECUTION_MAP: Indexed<ExecutionInfo<any[]> | undefined> = {};
    private TASKS_MAP: WeakMap<Array<LoadOptions<any[], any>>, Task | undefined> = new WeakMap();
    private QUEUES_HASH: Indexed<Array<LoadOptions<any[], any>> | undefined> = {};

    public *execute<TArgs extends any[]>(queue: ExecutionInfo<TArgs>['queue']) {
        let task = this.TASKS_MAP.get(queue);
        if (task && task.isRunning()) {
            return;
        }

        const self = this;
        task = yield* spawn(function* () {
            try {
                while (queue.length) {
                    const { loadId, operationId, saga, args, options } = queue.shift() as LoadOptions<any[], any>;
                    const { onLoad = emptyFlow, onDispose = emptyFlow } = saga;

                    const loadOperation = self._operationsService.createOperation({
                        operationArgs: [operationId, onLoad, options?.updateStrategy],
                    });

                    const loadTask = yield* fork(loadOperation.run, ...args);

                    yield* take(isDisposeSignal(loadId));
                    loadTask.cancel();

                    yield* call(onDispose, ...args);
                    self.QUEUES_HASH[loadId] = undefined;
                }
            } finally {
                task = undefined;
            }
        });

        this.TASKS_MAP.set(queue, task);
    }

    @daemon(DaemonMode.Every)
    public *load<TArgs extends any[]>(options: LoadOptions<TArgs, any>) {
        const { loadId, operationId } = options;
        if (!this.EXECUTION_MAP[operationId]) {
            this.EXECUTION_MAP[operationId] = { queue: [] };
            yield* call(this._operationsService.registerConsumer, this, operationId);
        }

        const queue = this.EXECUTION_MAP[operationId]?.queue;
        assertNullable(queue);

        this.QUEUES_HASH[loadId] = queue;
        // queue always has only one next element
        if (queue.length < 1) {
            queue.push(options);
        } else {
            console.warn('Probably dispose missed');
            queue[0] = options;
        }

        yield* call(this.execute, queue);
    }

    @daemon(DaemonMode.Every)
    public *dispose(id: string) {
        const queue = this.QUEUES_HASH[id];
        if (queue?.[0]?.loadId === id) {
            queue.pop();
            this.QUEUES_HASH[id] = undefined;
            return;
        }

        yield* put({ type: DISPOSE_SIGNAL, payload: id });
    }

    @daemon(DaemonMode.Every)
    public *cleanup({ operationId }: { operationId: string }) {
        this.EXECUTION_MAP[operationId] = undefined;
        yield* call(this._operationsService.unregisterConsumer, this, operationId);
    }
}
