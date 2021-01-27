import { call } from 'typed-redux-saga';
import { Pattern } from 'redux-saga/effects';

import { createDaemon, DaemonMode } from '../utils/createDaemon';
import { Gen, Saga } from '../types';
import { createActions } from '../utils/createActions';
import { getClassMethods } from '../utils/getKeys';

interface PrivateServiceProps {
    __$daemonMode?: DaemonMode;
    __$action?: Pattern<any>;
}

type ServiceStatus = 'unavailable' | 'ready';

let uuid = 0;
export class BaseService<TRunArgs extends any[] = [], TRes = void> {
    private _daemons: ReturnType<typeof createDaemon>[];
    private _status: ServiceStatus = 'unavailable';
    private _uuid: string;

    constructor() {
        this._uuid = `${uuid++}`;
        this._daemons = [];

        const methods = getClassMethods(this);
        methods.forEach(m => {
            const origin = (this[m as keyof this] as any) as Function;
            const bond = origin.bind(this);
            // copy possible decorators meta
            this[m as keyof this] = Object.assign(bond, origin);
        });

        const Service = this as { [K in keyof this]: this[K] & PrivateServiceProps };
        const actions = createActions(Service, this.getUUID());

        methods.forEach(key => {
            const method = Service[key as keyof this];
            const { __$daemonMode, __$action } = method;

            if (!__$daemonMode) {
                return;
            }

            const daemon = createDaemon(
                __$action || actions[key as keyof typeof actions].toString(),
                (method as any) as Saga,
                {
                    mode: __$daemonMode,
                }
            );

            this._daemons.push(daemon);
        });
    }

    toString() {
        throw new Error('toString should return uniq constant');
    }

    *run(...args: TRunArgs): Gen<TRes | undefined> {
        const result: TRes | undefined = undefined;

        for (const daemon of this._daemons) {
            yield* call(daemon.run);
        }

        this._status = 'ready';
        return result;
    }

    *destroy(...args: TRunArgs): Gen<void> {
        this._status = 'unavailable';

        for (const daemon of this._daemons) {
            yield* call(daemon.destroy);
        }
    }

    getStatus = () => this._status;
    getUUID = () => this._uuid;
}
