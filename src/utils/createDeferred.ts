export type Deferred<T> = {
    resolve: (value?: T | PromiseLike<T>) => void;
    reject: (reason?: Error) => void;
    promise: Promise<T>;
};

export const createDeferred = <T = unknown>() => {
    const deferred: Partial<Deferred<T>> = {};

    deferred.promise = new Promise<T>((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });

    deferred.promise.catch(() => undefined);

    return deferred as Deferred<T>;
};
