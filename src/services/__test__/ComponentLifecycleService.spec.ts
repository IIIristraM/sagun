import { call, delay, put } from 'typed-redux-saga';

import { getSagaRunner } from '_test/utils';

import { ComponentLifecycleService } from '../ComponentLifecycleService';
import { OperationId } from '../../types';
import { OperationService } from '../OperationService';
import { serviceActionsFactory } from '../serviceUtils';

const DELAY = 10;

test('onLoad skip loads in between', () => {
    const runner = getSagaRunner();
    const operationService = new OperationService({ hash: {} });
    const service = new ComponentLifecycleService(operationService);
    const createServiceActions = serviceActionsFactory();
    const serviceActions = createServiceActions(service);
    const iterations = 15;
    let loadCounter = 0;

    function* inc(counter: number) {
        loadCounter += counter;
        yield* delay(DELAY);
    }

    const componentSaga = { onLoad: inc };
    const operationId = 'OPERATION_ID' as OperationId<void, [number]>;

    function* saga() {
        yield* call(service.run);

        for (let i = 1; i <= iterations; i++) {
            const loadId = `LOAD_ID_${i}`;
            yield* put(
                serviceActions.load({
                    loadId,
                    operationId,
                    saga: componentSaga,
                    args: [i],
                })
            );
        }

        yield* delay(DELAY);
        yield* put(serviceActions.dispose(`LOAD_ID_${1}`));
        yield* delay(DELAY);
        yield* call(service.destroy);
    }

    return runner
        .run(saga)
        .toPromise()
        .then(() => {
            // first and last loads 1 + 15
            expect(loadCounter).toBe(16);
        });
});

test('onLoad / onDispose invoked in a right order', () => {
    const runner = getSagaRunner();
    const operationService = new OperationService({ hash: {} });
    const service = new ComponentLifecycleService(operationService);
    const createServiceActions = serviceActionsFactory();
    const serviceActions = createServiceActions(service);
    const iterations = 15;
    let loadCounter = 0;
    let disposeCounter = 0;
    let history = '';
    const mock = jest.fn((counter: number) => counter);

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

    function* saga() {
        yield* call(service.run);

        for (let i = 0; i < iterations; i++) {
            const loadId = `LOAD_ID_${i}`;
            yield* put(
                serviceActions.load({
                    loadId,
                    operationId,
                    saga: componentSaga,
                    args: [i],
                })
            );
            yield* delay(DELAY / 2);
            yield* put(serviceActions.dispose(loadId));
        }

        yield* delay(DELAY / 2);
        yield* call(service.destroy);
    }

    return runner
        .run(saga)
        .toPromise()
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
    const operationService = new OperationService({ hash: {} });
    const service = new ComponentLifecycleService(operationService);
    const createServiceActions = serviceActionsFactory();
    const serviceActions = createServiceActions(service);
    const mockLoad = jest.fn((...options: any[]) => ({}));
    const mockDispose = jest.fn((...options: any[]) => ({}));

    function* onLoad(i: string) {
        mockLoad(i);
    }

    function* onDispose(i: string) {
        mockDispose(i);
    }

    const saga = { onLoad, onDispose };

    function* main() {
        yield* call(service.run);

        yield* put(
            serviceActions.load({
                loadId: 'xxx',
                operationId: 'xxx' as OperationId<void, [string]>,
                saga,
                args: ['1'],
            })
        );

        yield* delay(0);

        yield* put(
            serviceActions.load({
                loadId: 'yyy',
                operationId: 'yyy' as OperationId<void, [string]>,
                saga,
                args: ['2'],
            })
        );

        yield* delay(DELAY);
        yield* put(serviceActions.dispose('xxx'));
        yield* put(serviceActions.dispose('yyy'));
        yield* delay(DELAY);
        yield* call(service.destroy);
    }

    return runner
        .run(main)
        .toPromise()
        .then(() => {
            expect(mockLoad).toHaveBeenCalledTimes(2);
            expect(mockLoad).toHaveBeenCalledWith('1');
            expect(mockLoad).toHaveBeenLastCalledWith('2');

            expect(mockDispose).toHaveBeenCalledTimes(2);
            expect(mockDispose).toHaveBeenCalledWith('1');
            expect(mockDispose).toHaveBeenLastCalledWith('2');
        });
});
