import { AnyAction, applyMiddleware, createStore, Reducer } from 'redux';
import createSagaMiddleware from 'redux-saga';

export const getSagaRunner = (reducer?: Reducer<any, AnyAction>) => {
    const sagaMiddleware = createSagaMiddleware();
    const store = applyMiddleware(sagaMiddleware)(createStore)(reducer || (x => x));

    return { run: sagaMiddleware.run, store };
};
