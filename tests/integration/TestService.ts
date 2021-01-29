import { call } from 'typed-redux-saga';

import { operation, OperationId, Service } from '../../src';

import { api, UserDetails } from './TestAPI';

export const userOperationId = (id: string) => `${id}_user` as OperationId<string, [string]>;
export const userDetailsOperationId = (id: string) => `${id}_details` as OperationId<UserDetails, [string]>;

export class TestService extends Service {
    toString() {
        return 'TestService';
    }

    @operation({
        ssr: true,
        id: userOperationId,
    })
    *getUser(id: string) {
        const { login } = yield* call(api.getUser, id);
        return login;
    }

    @operation({
        ssr: true,
        id: userDetailsOperationId,
    })
    *getUserDetails(id: string) {
        return yield* call(api.getUserDetails, id);
    }

    @operation({
        ssr: true,
    })
    *getList() {
        const { items } = yield* call(api.getList);
        return items;
    }
}
