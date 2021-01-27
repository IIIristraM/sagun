import { call, delay, spawn, take, takeEvery, takeLatest } from 'typed-redux-saga';
import { Pattern } from 'redux-saga/effects';
import { Task } from 'redux-saga';

import { Action, CallEffectTarget } from '../types';

import { errorHandler } from './errorHandler';
import { prepareCall } from './prepareCall';

export enum DaemonMode {
    Sync = 'SYNC',
    Every = 'EVERY',
    Last = 'LAST',
    Schedule = 'SCHEDULE',
}

export const DAEMON_DEFAULTS = {
    mode: DaemonMode.Sync,
};

const extractArgs = ({ payload }: Action<any>) => (Array.isArray(payload) ? payload : [payload]);

const extractor = (func: CallEffectTarget) =>
    function* (action: Action<any>) {
        return yield* call(prepareCall.call(this, func), ...extractArgs(action));
    };

export const daemon = function* (pattern: Pattern<any>, func: CallEffectTarget) {
    while (true) {
        const action = yield* take(pattern);
        yield* call(errorHandler(extractor(func)), action);
    }
};

export const createScheduledDaemon = function* (timeout: number, func: CallEffectTarget) {
    while (true) {
        yield* call(errorHandler(func));
        yield* delay(timeout);
    }
};

export function createDaemon(pattern: Pattern<any>, func: CallEffectTarget, config?: Partial<typeof DAEMON_DEFAULTS>) {
    let task: Task | undefined;
    const { mode } = { ...DAEMON_DEFAULTS, ...config };

    if (typeof pattern === 'number' && mode !== DaemonMode.Schedule) {
        throw new Error('Daemon mode is inconsistent with other options');
    }

    const run = function* () {
        if (task) {
            return;
        }

        if (mode === DaemonMode.Schedule) {
            task = yield* spawn(() => createScheduledDaemon(pattern as number, func));
            return;
        }

        if (mode === DaemonMode.Every) {
            task = yield* spawn(function* () {
                yield* takeEvery(pattern, errorHandler(extractor(func)));
            });
            return;
        }

        if (mode === DaemonMode.Last) {
            task = yield* spawn(function* () {
                yield* takeLatest(pattern, errorHandler(extractor(func)));
            });
            return;
        }

        task = yield* spawn(() => daemon(pattern, func));
    };

    const destroy = function () {
        if (!task) {
            return;
        }

        task.cancel();
        task = undefined;
    };

    return {
        run,
        destroy,
    };
}
