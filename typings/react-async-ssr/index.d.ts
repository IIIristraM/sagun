declare module 'react-async-ssr' {
    export function renderToStringAsync(jsx: JSX.Element): Promise<string>;
}

declare module 'react-async-ssr/symbols' {
    export const NO_SSR: symbol;
}
