import { call } from 'typed-redux-saga';
import { Pattern } from 'redux-saga/effects';

import { createDaemon, DaemonMode } from '../utils/createDaemon';
import { Gen, Saga } from '../types';
import { createActions } from '../utils/createActions';
import { Dependency } from './Dependency';
import { getClassMethods } from '../utils/getKeys';
import { UUIDGenerator } from './UUIDGenerator';

interface PrivateServiceProps {
    __$daemonMode?: DaemonMode;
    __$action?: Pattern<any>;
}

type ServiceStatus = 'unavailable' | 'ready';

const uuidGen = new UUIDGenerator();
export class BaseService<TRunArgs extends any[] = [], TRes = void> extends Dependency {
    private _daemons: ReturnType<typeof createDaemon>[];
    private _status: ServiceStatus = 'unavailable';
    private _uuid: string;

    constructor() {
        super();
        this._uuid = `${uuidGen.uuid()}`;
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

    getStatus() {
        return this._status;
    }

    getUUID() {
        return this._uuid;
    }
}
