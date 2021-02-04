import { Pattern } from 'redux-saga/effects';

import { DaemonMode } from '../utils/createDaemon';

export { DaemonMode } from '../utils/createDaemon';

export function daemon(mode?: DaemonMode, action?: Pattern<any>) {
    return function daemonMeta(target: any, key: string, descriptor: PropertyDescriptor): PropertyDescriptor {
        descriptor.value.__$daemonMode = mode || DaemonMode.Sync;
        descriptor.value.__$action = action;

        return descriptor;
    };
}
