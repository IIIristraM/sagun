import React, { createContext, Reducer, useCallback, useContext, useState, type ReactNode } from 'react';
import { call } from 'typed-redux-saga';
import { applyMiddleware, createStore, combineReducers, Store } from 'redux';
import { Provider } from 'react-redux';
import createSagaMiddleware, { Task } from 'redux-saga';
import { LiveError, LiveContext } from 'react-live';

import { ErrorBoundaryErrorMessageFallback } from '@docusaurus/theme-common';
import ErrorBoundary from '@docusaurus/ErrorBoundary';
import Translate from '@docusaurus/Translate';

import styles from './styles.module.css';

import {
    ComponentLifecycleService,
    OperationService,
    asyncOperationsReducer,
    Root,
    useOperation,
} from '../../../../lib';

interface SagunProviderProps {
    children: ReactNode;
}

export default function getProvider() {
    const sagaMiddleware = createSagaMiddleware();
    useOperation.setPath(state => state.asyncOperations);

    let store: Store<any, any> | null = null;
    let operationService: OperationService | null = null;
    let componentLifecycleService: ComponentLifecycleService | null = null;
    let task: Task | null = null;

    function setup() {
        store = applyMiddleware(sagaMiddleware)(createStore)(
            combineReducers({
            asyncOperations: asyncOperationsReducer as Reducer<any, any>,
            })
        );
        
        operationService = new OperationService();
        componentLifecycleService = new ComponentLifecycleService(operationService);
        
        task = sagaMiddleware.run(function* () {
            yield* call(operationService!.run);
            yield* call(componentLifecycleService!.run);
        });
    }

    setup();

    const SagunContext = createContext<{
        reset: () => void;
    } | null>(null);

    function SagunProvider({ children }: SagunProviderProps): ReactNode {
        const [key, setKey] = useState(0);

        const forceUpdate = useCallback(async() => {
            setup();
            setKey(key + 1);
        }, [key]);

        return (
            <SagunContext.Provider value={{ reset: forceUpdate }}>
                <Root operationService={operationService} componentLifecycleService={componentLifecycleService} key={key}>
                    <ErrorBoundary
                        fallback={params => <ErrorBoundaryErrorMessageFallback {...params} />}>
                        <Provider store={store}>
                            {children}
                        </Provider>
                    </ErrorBoundary>
                </Root>
            </SagunContext.Provider>
        );
    }

    function Errors() {
        const { reset } = useContext(SagunContext);
        const { error } = useContext(LiveContext);

        return (
            <div className={styles.error}>
                {error && (
                    <button className={styles.retryButton} onClick={reset}>
                        <Translate id="playground.reset">Retry</Translate>
                    </button>
                )}
                <LiveError />
            </div>
        )
    }

    return {
        SagunProvider,
        Errors,
    }
}
