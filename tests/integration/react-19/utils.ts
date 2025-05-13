import ReactDOM from 'react-dom/client';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'stream';
import { JSX } from 'react';

import { wait } from './shared';
import { createDeferred } from './src';

export async function render(reactEl: JSX.Element) {
    const el = window.document.getElementById('app')!;
    const container = ReactDOM.createRoot(el);
    container.render(reactEl);
    await wait(0);
    return {
        el,
        unmount: async () => {
            container.unmount();
            await wait(0);
        },
    };
}

export function hydrate(reactEl: JSX.Element) {
    const el = window.document.getElementById('app')!;

    ReactDOM.hydrateRoot(el!, reactEl);
}

export async function serverRender(reactEl: JSX.Element) {
    let html = '';
    const defer = createDeferred();
    
    const stream = renderToPipeableStream(
        reactEl,
        {
            onAllReady() {
                const s = new PassThrough();
                stream.pipe(s);

                s.on('data', chunk => {
                    html += chunk;
                });

                s.on('end', () => {
                    defer.resolve();
                });
            },
            onError(err) {
                console.error(err);
            },
        }
    );

    await defer.promise;
    return html;
}