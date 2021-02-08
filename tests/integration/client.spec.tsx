import { call, delay } from 'typed-redux-saga';
import {
    ComponentLifecycleService,
    Operation,
    OperationService,
    asyncOperationsReducer as reducer,
    Root,
    useOperation,
    useSaga,
} from '_lib/';
import React, { Suspense } from 'react';
import { act } from 'react-dom/test-utils';
import { combineReducers } from 'redux';
import { getSagaRunner } from '_test/utils';
import jsdom from 'jsdom';
import { Provider } from 'react-redux';
import ReactDOM from 'react-dom';

const DELAY = 50;

beforeAll(() => {
    jest.useFakeTimers();
});

afterAll(() => {
    jest.useRealTimers();
});

test('execute nested sagas on client', async () => {
    const runner = getSagaRunner(
        combineReducers({
            asyncOperations: reducer,
        })
    );
    useOperation.setPath(x => x.asyncOperations);

    const { window } = new jsdom.JSDOM(`
        <html>
            <body>
                <div id="app"></div>
            </body>
        </html>
    `);

    (global as any).window = window;
    (global as any).document = window.document;

    const fn = jest.fn(() => 1);
    const fn2 = jest.fn((x: number) => x + 2);
    const operationService = new OperationService();
    const componentLifecycleService = new ComponentLifecycleService(operationService);

    const task = runner.run(function* () {
        yield* call(operationService.run);
        yield* call(componentLifecycleService.run);
    });

    const Item = (props: { x: number }) => {
        const { operationId } = useSaga(
            {
                onLoad: function* (x: number) {
                    yield* delay(DELAY);
                    return fn2(x); // step 2 and 3
                },
            },
            [props.x]
        );

        return (
            <Operation operationId={operationId}>
                {({ result }) => (result && result < 5 ? <Item x={result} /> : null)}
            </Operation>
        );
    };

    const App = () => {
        const { operationId } = useSaga({
            onLoad: function* () {
                yield* delay(DELAY);
                return fn(); // step 1
            },
        });

        return (
            <Suspense fallback="">
                <Operation operationId={operationId}>{({ result }) => (result ? <Item x={result} /> : null)}</Operation>
            </Suspense>
        );
    };

    await act(async () => {
        ReactDOM.render(
            <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
                <Provider store={runner.store}>
                    <App />
                </Provider>
            </Root>,
            window.document.getElementById('app')!
        );
    });

    for (let step = 1; step <= 3; step++) {
        await act(async () => {
            jest.advanceTimersByTime(DELAY + 1);
        });
    }

    task.cancel();
    await task.toPromise();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(2);
    const values = Array.from(runner.store.getState().asyncOperations.values());
    expect(values[0]?.result).toBe(1);
    expect(values[1]?.result).toBe(3);
    expect(values[2]?.result).toBe(5);
});
