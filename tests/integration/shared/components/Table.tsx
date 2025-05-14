import { call } from 'typed-redux-saga';
import React, { Suspense } from 'react';

import { Operation, useSaga, useServiceConsumer } from '../../src';

import { TestService } from '../TestService';

export default function Table() {
    const { service } = useServiceConsumer(TestService);

    const { operationId } = useSaga({
        id: 'table',
        onLoad: function* () {
            return yield* call(service.getList);
        },
    });

    return (
        <Suspense fallback="">
            <Operation operationId={operationId}>
                {({ result }) => (
                    <div>
                        {result?.map(item => (
                            <span className="table-item" key={item}>
                                {item}
                            </span>
                        ))}
                    </div>
                )}
            </Operation>
        </Suspense>
    );
}
