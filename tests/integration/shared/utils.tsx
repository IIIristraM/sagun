import { Exact } from '@iiiristram/ts-type-utils';
import React from "react";

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
