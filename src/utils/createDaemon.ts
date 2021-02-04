import { apply, call, delay, spawn, take, takeEvery, takeLatest } from 'typed-redux-saga';
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

function extractor(func: CallEffectTarget) {
    return function* extractorInner(action: Action<any>) {
        const payload = action.payload;
        const target = prepareCall.call(this, func);
        return yield* apply(target[0], target[1], Array.isArray(payload) ? payload : [payload]);
    };
}

export function* daemon(pattern: Pattern<any>, func: CallEffectTarget) {
    const wrappedFunc = errorHandler(extractor(func));
    while (true) {
        const action = yield* take(pattern);
        yield* call(wrappedFunc, action);
    }
}

export function* createScheduledDaemon(timeout: number, func: CallEffectTarget) {
    const wrappedFunc = errorHandler(func);
    while (true) {
        yield* call(wrappedFunc);
        yield* delay(timeout);
    }
}

export function createDaemon(pattern: Pattern<any>, func: CallEffectTarget, config?: Partial<typeof DAEMON_DEFAULTS>) {
    let task: Task | undefined;
    const { mode } = { ...DAEMON_DEFAULTS, ...config };
    const wrappedFunc = errorHandler(extractor(func));

    if (typeof pattern === 'number' && mode !== DaemonMode.Schedule) {
        throw new Error('Daemon mode is inconsistent with other options');
    }

    function* run() {
        if (task) {
            return;
        }

        if (mode === DaemonMode.Schedule) {
            task = yield* spawn(createScheduledDaemon, pattern as number, func);
            return;
        }

        if (mode === DaemonMode.Every) {
            task = yield* spawn(takeEvery as any, pattern, wrappedFunc);
            return;
        }

        if (mode === DaemonMode.Last) {
            task = yield* spawn(takeLatest as any, pattern, wrappedFunc);
            return;
        }

        task = yield* spawn(daemon, pattern, func);
    }

    function destroy() {
        if (!task) {
            return;
        }

        task.cancel();
        task = undefined;
    }

    return {
        run,
        destroy,
    };
}
