import { call } from 'typed-redux-saga';
import React from 'react';

import { useOperation, useSaga, useServiceConsumer } from '../../src';

import { TestService, userOperationId } from '../TestService';

type Props = React.PropsWithChildren<{ id: string }>;

function Inner({ id, children }: Props) {
    const { result: login } = useOperation({ operationId: userOperationId(id), suspense: true });

    return (
        <div className="user">
            {login}
            {children}
        </div>
    );
}

export default function UserInfo({ children, id }: Props) {
    const { service } = useServiceConsumer(TestService);
    useSaga(
        {
            id: `user_info_${id}`,
            onLoad: function* (id: string) {
                yield* call(service.getUser, id);
            },
        },
        [id]
    );

    return <Inner id={id}>{children}</Inner>;
}
