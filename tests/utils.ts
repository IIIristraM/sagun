import { AnyAction, applyMiddleware, createStore, Reducer, Store } from 'redux';
import createSagaMiddleware from 'redux-saga';

export function getSagaRunner<T extends Reducer<any, AnyAction>>(reducer?: T) {
    const sagaMiddleware = createSagaMiddleware();
    const store = applyMiddleware(sagaMiddleware)(createStore)(reducer || (x => x)) as undefined extends T
        ? Store<any, AnyAction>
        : Store<ReturnType<T>, AnyAction>;

    return { run: sagaMiddleware.run, store };
}

// jest.resetModuleRegistry makes hooks to throw error so jest.isolateModules
export function isolate(fn: () => Promise<unknown>) {
    return new Promise<void>((resolve, reject) => {
        jest.isolateModules(async () => {
            try {
                await fn();
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });
}

export function delay(ms: number) {
    return new Promise<void>(resolve => {
        setTimeout(resolve, ms);
    });
}
