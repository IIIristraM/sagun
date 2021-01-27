export function isNodeEnv() {
    // @ts-ignore
    return typeof window === 'undefined' && !!process;
}
