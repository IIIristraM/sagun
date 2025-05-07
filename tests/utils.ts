import { AnyAction, applyMiddleware, createStore, Reducer, Store } from 'redux';
import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
import { Exact } from '@iiiristram/ts-type-utils';
import ReactDOM from 'react-dom';

type Runner<S = any> = {
    run: SagaMiddleware<object>['run'];
    store: Store<S, AnyAction>;
};

export function getSagaRunner(): Runner;
export function getSagaRunner<T extends Reducer<any, AnyAction>>(reducer: T): Runner<ReturnType<T>>;
export function getSagaRunner<T extends Reducer<any, AnyAction>>(reducer?: T) {
    const sagaMiddleware = createSagaMiddleware();
    const store = applyMiddleware(sagaMiddleware)(createStore)(reducer || (x => x));
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

export function wait(ms: number) {
    return new Promise<void>(resolve => {
        setTimeout(resolve, ms);
    });
}

export const resource = () => {
    let result: any = null;

    return {
        read: () => {
            if (result !== null) {
                return result;
            }

            throw new Promise<void>(resolve => {
                setTimeout(() => {
                    result = 1;
                    resolve();
                }, 10);
            });
        },
    };
};

export function exact<T, Expected>(result: Exact<T, Expected>) {
    //
}

export function render(reactEl: JSX.Element) {
    const el = window.document.getElementById('app')!;
    ReactDOM.render(reactEl, el);
    return {
        el,
        unmount: async () => {
            ReactDOM.unmountComponentAtNode(el);
            await wait(0);
        },
    };
}

export function hydrate(reactEl: JSX.Element) {
    const el = window.document.getElementById('app')!;

    ReactDOM.hydrate(reactEl, el!);
}
