import { beforeEach, expect, test, vi } from 'vitest';

import React, { useEffect } from 'react';
import { call } from 'typed-redux-saga';
import jsdom from 'jsdom';

import { daemon, DaemonMode } from '../../decorators';
import { OperationService, Service } from '../../services';
import { createDeferred } from '../../utils/createDeferred';

import { useService } from '../useService';

import { getSagaRunner } from '../../test-utils';
import { render } from '_root/utils';
import { wait } from '_test/';

const processLoading = vi.fn((x: string, y: number) => ({}));
const processDisposing = vi.fn(() => ({}));

class TestServiceClass extends Service<[string, number]> {
    toString() {
        return 'TestServiceClass';
    }

    @daemon(DaemonMode.Every)
    *foo() {
        return 1;
    }

    *run(...args: [string, number]) {
        yield* call(processLoading, ...args);
        return yield* call([this, super.run], ...args);
    }

    *destroy(...args: [string, number]) {
        yield* call(processDisposing);
        yield* call([this, super.destroy], ...args);
    }
}

beforeEach(() => {
    processLoading.mockClear();
    processDisposing.mockClear();
});

test('useService runs and destroys service', async () => {
    const runner = getSagaRunner();
    const { window } = new jsdom.JSDOM(`
        <html>
            <body>
                <div id="app"></div>
            </body>
        </html>
    `);

    (global as any).window = window;
    (global as any).document = window.document;

    const mountDefer = createDeferred();
    const unmountDefer = createDeferred();

    return runner.run(function* ({ operationService, TestProvider }) {
        const TestComponent: React.FC<{}> = () => {
            useService(new TestServiceClass(operationService), ['1', 1]);

            useEffect(() => {
                mountDefer.resolve();
                return () => unmountDefer.resolve();
            }, []);

            return null;
        };

        const { unmount } = yield render(
            <TestProvider>
                <TestComponent />
            </TestProvider>
        );

        yield mountDefer.promise;
        yield wait(10);
        yield unmount();
        yield unmountDefer.promise;
        yield wait(10);

        expect(processLoading).toHaveBeenCalledTimes(1);
        expect(processLoading).toHaveBeenCalledWith('1', 1);
        expect(processDisposing).toHaveBeenCalledTimes(1);
    });
});

test('types are correctly inferred from hook args', () => {
    const operationService = new OperationService({ hash: {} });

    // @ts-ignore
    function TestComponent() {
        const arg0 = 1;
        const arg1 = '1';
        const args: [string, number] = [arg1, arg0];

        useService(new TestServiceClass(operationService), args);

        useService(new TestServiceClass(operationService), [arg1, arg0]);

        useService(
            new TestServiceClass(operationService),
            // TODO error is preferable
            [arg0, arg1]
        );

        useService<[number, string], void>(
            // @ts-expect-error
            new TestServiceClass(operationService),
            [arg0, arg1]
        );

        useService<[string, number], void>(
            new TestServiceClass(operationService),
            // @ts-expect-error
            [arg0, arg1]
        );

        return null;
    }
});
