import { call } from 'typed-redux-saga';
import React from 'react';

import { withSaga } from '../../../src';

import { TestService } from '../TestService';

export default withSaga({
    sagaFactory: ({ getService }) => ({
        onLoad: function* () {
            const service = getService(TestService);
            return yield* call(service.getList);
        },
    }),
})(function Table({ operation }) {
    const result = operation.result;

    return (
        <div>
            {result?.map(item => (
                <span key={item}>{item}</span>
            ))}
        </div>
    );
});
