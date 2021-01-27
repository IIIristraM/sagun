import { renderToStringAsync as renderToStringAsyncBase } from 'react-async-ssr';

export const renderToStringAsync: (jsx: JSX.Element) => Promise<string> = renderToStringAsyncBase;
