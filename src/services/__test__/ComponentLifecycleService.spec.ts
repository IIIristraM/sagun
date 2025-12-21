import { expect, test, vi } from 'vitest';

import { call, delay, put } from 'typed-redux-saga';

import { getSagaRunner } from '../../test-utils';

import { ComponentLifecycleService } from '../ComponentLifecycleService';
import { OperationId } from '../../types';
import { OperationService } from '../OperationService';
import { serviceActionsFactory } from '../serviceUtils';

const DELAY = 10;

test('onLoad skip loads in between', () => {
    const runner = getSagaRunner();
    const createServiceActions = serviceActionsFactory();

    const iterations = 15;
    let loadCounter = 0;

    function* inc(counter: number) {
        loadCounter += counter;
        yield* delay(DELAY);
    }

    const componentSaga = { onLoad: inc };
    const operationId = 'OPERATION_ID' as OperationId<void, [number]>;

    return runner
        .run(function* ({ componentLifecycleService }) {
            const serviceActions = createServiceActions(componentLifecycleService);

            for (let i = 1; i <= iterations; i++) {
                componentLifecycleService.scheduleLoad(operationId, {
                    loadId: `xxx_${i}`,
                    operationId,
                    saga: componentSaga,
                    args: [i],
                });
                yield* put(serviceActions.load(operationId, `xxx_${i}`));
            }

            yield* delay(DELAY);
            yield* put(serviceActions.cleanup({ operationId }));
            yield* delay(DELAY);
        })
        .then(() => {
            // first and last loads 1 + 15
            expect(loadCounter).toBe(16);
        });
});

test('onLoad / onDispose invoked in a right order', () => {
    const runner = getSagaRunner();
    const createServiceActions = serviceActionsFactory();

    const iterations = 15;
    let loadCounter = 0;
    let disposeCounter = 0;
    let history = '';
    const mock = vi.fn((counter: number) => counter);

    function* inc(counter: number) {
        loadCounter++;
        history += `_${counter}l`;
        yield* delay(DELAY);
    }

    function* dec(counter: number) {
        disposeCounter++;
        mock(disposeCounter);
        history += `_${counter}d`;
        yield* delay(DELAY);
    }

    const componentSaga = { onLoad: inc, onDispose: dec };
    const operationId = 'OPERATION_ID' as OperationId<void, [number]>;

    return runner
        .run(function* ({ componentLifecycleService }) {
            const serviceActions = createServiceActions(componentLifecycleService);

            for (let i = 0; i < iterations; i++) {
                componentLifecycleService.scheduleLoad(operationId, {
                    loadId: 'xxx',
                    operationId,
                    saga: componentSaga,
                    args: [i],
                });
                yield* put(serviceActions.load(operationId, 'xxx'));
                yield* delay(DELAY / 2);
            }

            yield* put(serviceActions.cleanup({ operationId }));
            yield* delay(DELAY / 2);
        })
        .then(() => {
            // callbacks called equal times
            expect(loadCounter).toBe(disposeCounter);
            // last onDispose called with the latest arguments
            expect(mock).toHaveBeenLastCalledWith(loadCounter);

            const historyList = history.split('_').filter(Boolean);
            // total count of callbacks should be even (onLoad + onDispose = 2)
            expect(historyList.length % 2).toBe(0);

            // each pair [onLoad, onDispose] was from the same cycle
            for (let i = 0; i < historyList.length; i += 2) {
                const loadItem = historyList[i];
                const disposeItem = historyList[i + 1];

                const loadType = loadItem[loadItem.length - 1];
                const disposeType = disposeItem[disposeItem.length - 1];
                expect(loadType).toBe('l');
                expect(disposeType).toBe('d');

                const loadCounter = loadItem.substring(0, loadItem.length - 1);
                const disposeCounter = disposeItem.substring(0, disposeItem.length - 1);
                expect(loadCounter).toBe(disposeCounter);
            }
        });
});

test('uniq onLoad / onDispose per instance', () => {
    const runner = getSagaRunner();
    const createServiceActions = serviceActionsFactory();

    const mockLoad = vi.fn((...options: any[]) => ({}));
    const mockDispose = vi.fn((...options: any[]) => ({}));

    function* onLoad(i: string) {
        mockLoad(i);
    }

    function* onDispose(i: string) {
        mockDispose(i);
    }

    const saga = { onLoad, onDispose };

    return runner
        .run(function* ({ componentLifecycleService }) {
            const serviceActions = createServiceActions(componentLifecycleService);

            const operationId = 'xxx' as OperationId<void, [string]>;
            componentLifecycleService.scheduleLoad(operationId, {
                loadId: 'xxx',
                operationId,
                saga,
                args: ['1'],
            });
            yield* put(serviceActions.load(operationId, 'xxx'));

            yield* delay(0);

            const operationId2 = 'yyy' as OperationId<void, [string]>;
            componentLifecycleService.scheduleLoad(operationId2, {
                loadId: 'yyy',
                operationId: operationId2,
                saga,
                args: ['2'],
            });
            yield* put(serviceActions.load(operationId2, 'yyy'));

            yield* delay(DELAY);
            yield* put(serviceActions.cleanup({ operationId }));
            yield* put(serviceActions.cleanup({ operationId: operationId2 }));
            yield* delay(DELAY);
        })
        .then(() => {
            expect(mockLoad).toHaveBeenCalledTimes(2);
            expect(mockLoad).toHaveBeenCalledWith('1');
            expect(mockLoad).toHaveBeenLastCalledWith('2');

            expect(mockDispose).toHaveBeenCalledTimes(2);
            expect(mockDispose).toHaveBeenCalledWith('1');
            expect(mockDispose).toHaveBeenLastCalledWith('2');
        });
});

test('onDispose after onLoad with error', () => {
    const runner = getSagaRunner();
    const createServiceActions = serviceActionsFactory();

    const mockLoad = vi.fn((...options: any[]) => ({}));
    const mockDispose = vi.fn((...options: any[]) => ({}));

    function* onLoad(i: string) {
        mockLoad(i);
        throw new Error('test error');
    }

    function* onDispose(i: string) {
        mockDispose(i);
    }

    const saga = { onLoad, onDispose };
    const operationId = 'xxx' as OperationId<void, [string]>;

    return runner.run(function* ({ componentLifecycleService }) {
        const serviceActions = createServiceActions(componentLifecycleService);

        componentLifecycleService.scheduleLoad(operationId, {
            loadId: 'xxx',
            operationId,
            saga,
            args: ['1'],
        });

        yield* put(serviceActions.load(operationId, 'xxx'));
        yield* delay(DELAY);
        yield* put(serviceActions.cleanup({ operationId }));
        yield* delay(DELAY);

        expect(mockLoad).toHaveBeenCalledTimes(1);
        expect(mockDispose).toHaveBeenCalledTimes(1);
        expect(componentLifecycleService.getCurrentExecution(operationId)).toBeUndefined();
    });
});
