import { applyMiddleware, createStore } from 'redux';
import React, { Suspense } from 'react';
import { call } from 'typed-redux-saga';
import createSagaMiddleware from 'redux-saga';
import http from 'http';
import { Provider } from 'react-redux';

import {
    asyncOperationsReducer,
    ComponentLifecycleService,
    Operation,
    OperationService,
    Root,
    useOperation,
    useSaga,
} from '../../src';
import { renderToStringAsync } from '../../src/serverRender';
useOperation.setPath(x => x);

const TEMPLATE = (html: string) => `
<html>
    <body>
        ${html}
    </body>
</html>
`;

const itemsCount = 1000;
let x = 0;
const Item = () => {
    const { operationId } = useSaga({
        onLoad: function* () {
            x = x + 1;
            return x;
        },
    });

    return <Operation operationId={operationId}>{({ result }) => <div>{result}</div>}</Operation>;
};

const App = () => {
    const children: JSX.Element[] = [];
    for (let i = 0; i < itemsCount; i++) {
        children.push(<Item key={i} />);
    }

    return <Suspense fallback="">{children}</Suspense>;
};

const server = http.createServer(async (req, res) => {
    const sagaMiddleware = createSagaMiddleware();
    const store = applyMiddleware(sagaMiddleware)(createStore)(asyncOperationsReducer);

    const operationService = new OperationService({ hash: {} });
    const componentLifecycleService = new ComponentLifecycleService(operationService);

    const task = sagaMiddleware.run(function* () {
        yield* call(operationService.run);
        yield* call(componentLifecycleService.run);
    });

    const html = await renderToStringAsync(
        <Root operationService={operationService} componentLifecycleService={componentLifecycleService}>
            <Provider store={store}>
                <App />
            </Provider>
        </Root>
    );

    task.cancel();
    await task.toPromise();

    res.write(TEMPLATE(html).trim());
    res.end();
});

server.listen(3000, 'localhost', () => {
    console.log('Listening...');
});
