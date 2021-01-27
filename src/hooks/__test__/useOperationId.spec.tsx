/**
 * @jest-environment jsdom
 */
import jsdom from 'jsdom';
import React from 'react';
import ReactDOM from 'react-dom';

import { getDefaultContext } from '../../context';
import { OperationId } from '../../types';
import { useOperationId } from '../useOperationId';

const { window } = new jsdom.JSDOM(`
    <html>
        <body>
            <div id="app"></div>
        </body>
    </html>
`);

const appEl = window.document.getElementById('app')!;

test('without context', () => {
    const ids: string[] = [];
    const Component: React.FC = ({ children }) => {
        const id = useOperationId<OperationId<any>>(null);
        ids.push(id);
        return <>{children}</>;
    };

    ReactDOM.render(
        <>
            <Component>
                <Component>
                    <Component />
                </Component>
                <Component>
                    <Component />
                </Component>
            </Component>
            <Component />
        </>,
        appEl
    );

    expect(ids.length).toBe(6);
    expect(new Set(ids).size).toBe(ids.length); // all values uniq
});

test('with context', () => {
    const ids: string[] = [];
    const context = {
        ...getDefaultContext({
            prefix: 'a',
        }),
        parentID: 'xxx',
    };

    const Component: React.FC = ({ children }) => {
        const id = useOperationId<OperationId<any>>(context);
        ids.push(id);
        return <>{children}</>;
    };

    ReactDOM.render(
        <>
            <Component>
                <Component>
                    <Component />
                </Component>
                <Component>
                    <Component />
                </Component>
            </Component>
            <Component />
        </>,
        appEl
    );

    expect(ids).toEqual(['a_xxx.0', 'a_xxx.1', 'a_xxx.2', 'a_xxx.3', 'a_xxx.4', 'a_xxx.5']);
});
