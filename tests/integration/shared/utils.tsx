import { AnyAction, applyMiddleware, createStore, Reducer, Store } from 'redux';
import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
import { Exact } from '@iiiristram/ts-type-utils';
import React from "react";

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

export function wait(ms: number) {
    return new Promise<void>(resolve => {
        setTimeout(resolve, ms + Math.random() * 20);
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

let version = 0;

// HACK
// vitest doesn't have "isolateModules" and "resetModules" breaks React contexts somehow.
// adding random part to a module allows to re-import module every time like "isolateModules"
export function importComponent(name: string) {
    return import(`./components/${name}?version=${version++}`);
}

function load<T extends React.FC<any>>(promise: () => Promise<{ default: T }>) {
    let Component: T | undefined;
    let innerPromise: Promise<void>;

    return function LoadComponent(props: Parameters<T>[0]) {
        if (!innerPromise || !Component) {
            innerPromise =
                innerPromise ||
                new Promise<void>(resolve => {
                    promise().then(res => {
                        Component = res.default;
                        resolve();
                    });
                });

            throw innerPromise;
        }

        return Component ? <Component {...props} /> : null;
    };
}

export function loadComponent(name: string) {
    return load(() => importComponent(name));
}
