import { JSX } from 'react';
import { renderToStringAsync as renderToStringAsyncBase } from 'react-async-ssr';

export const renderToStringAsync: (jsx: JSX.Element, options?: { fallbackFast?: boolean }) => Promise<string> =
    renderToStringAsyncBase;
