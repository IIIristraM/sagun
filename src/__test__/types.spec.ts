import { call } from 'typed-redux-saga';
import { test } from 'vitest';

import { exact } from '_test/utils';

import { Callable } from '../types';

function testFn<TArgs extends any[], TRes>(cb: Callable<TArgs, TRes>) {
    return function* (...args: TArgs) {
        return yield* call(cb, ...args);
    };
}

test('Test Callable<TArgs, TRes>', (): undefined => {
    function* testGen() {
        const sync = yield* call(testFn(() => 1));
        exact<typeof sync, number>(true);

        const async = yield* call(testFn(() => Promise.resolve(1)));
        exact<typeof async, number>(true);

        const saga = yield* call(
            testFn(function* () {
                return 1;
            })
        );
        exact<typeof saga, number>(true);

        const sagaWithPromise = yield* call(
            testFn(function* () {
                return yield* call(() => Promise.resolve(1));
            })
        );
        exact<typeof sagaWithPromise, number>(true);
    }

    return !!testGen && undefined;
});
