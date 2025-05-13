import ReactDOM from 'react-dom';

import { wait } from './shared';
import { renderToStringAsync } from 'react-async-ssr';

export async function render(reactEl: JSX.Element) {
    const el = window.document.getElementById('app')!;
    ReactDOM.render(reactEl, el);
    await wait(0);
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

export async function serverRender(reactEl: JSX.Element) {
    return await renderToStringAsync(reactEl);
}