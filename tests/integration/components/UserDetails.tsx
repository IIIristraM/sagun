import { call } from 'typed-redux-saga';
import React from 'react';

import { useOperation, withSaga } from '../../../src';

import { TestService, userOperationId } from '../TestService';

type CardProps = {
    login?: string;
    id: string;
};

const Card = withSaga({
    sagaFactory: ({ getService }) => ({
        onLoad: function* (id: string, login?: string) {
            if (!login) return;
            const service = getService(TestService);
            return yield* call(service.getUserDetails, id);
        },
    }),
    argsMapper: ({ login, id }: CardProps) => [id, login],
})(function Card({ operation }) {
    return <span className="card">{operation.result?.cardLastDigits}</span>;
});

const UserDetails: React.FC<{ id: string }> = function UserDetails({ id }) {
    const { result: login } = useOperation({ operationId: userOperationId(id), suspense: true });
    return <Card login={login} id={id} fallback="" />;
};

export default UserDetails;
