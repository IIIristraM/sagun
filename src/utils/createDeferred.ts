export type Deferred<T> = {
    resolve: (value?: T | PromiseLike<T>) => void;
    reject: (reason?: Error) => void;
    promise: Promise<T>;
};

function swallow() {
    return undefined;
}

export const createDeferred = <T = unknown>() => {
    const deferred: Partial<Deferred<T>> = {};

    deferred.promise = new Promise<T>(function (resolve, reject) {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });

    deferred.promise.catch(swallow);

    return deferred as Deferred<T>;
};
