export function assertNullable<T>(val: T | undefined | null): asserts val is T {
    if (val === undefined || val === null) {
        throw new Error('value is expected to be defined');
    }
}
