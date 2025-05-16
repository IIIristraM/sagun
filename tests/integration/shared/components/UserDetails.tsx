import { call } from 'typed-redux-saga';
import React, { Suspense } from 'react';

import { Operation, useOperation, useSaga, useServiceConsumer } from '../../src';

import { TestService, userOperationId } from '../TestService';

type CardProps = {
    login?: string;
    id: string;
};

function Card({ login, id }: CardProps) {
    const { service } = useServiceConsumer(TestService);
    const { operationId } = useSaga(
        {
            id: `card_${login}_${id}`,
            onLoad: function* (id: string, login?: string) {
                if (!login) return;
                return yield* call(service.getUserDetails, id);
            },
        },
        [id, login]
    );

    return (
        <Operation operationId={operationId}>
            {operation => <span className="card">{operation.result?.cardLastDigits}</span>}
        </Operation>
    );
}

const UserDetails: React.FC<{ id: string }> = function UserDetails({ id }) {
    const { result: login } = useOperation({ operationId: userOperationId(id), suspense: true });
    return (
        <Suspense fallback="">
            <Card login={login} id={id} />
        </Suspense>
    );
};

export default UserDetails;
