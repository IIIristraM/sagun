import { Map } from 'immutable';

import { AsyncOperation } from './types';
import { createAction } from './utils/createActions';

const CONSTANTS = {
    ADD_OR_UPDATE_OPERATION: '@sagun/ADD_OR_UPDATE_OPERATION' as const,
    REMOVE_OPERATION: '@sagun/REMOVE_OPERATION' as const,
};

const addOrUpdateOperation = createAction(
    CONSTANTS.ADD_OR_UPDATE_OPERATION,
    function (operationPatch: Omit<Partial<AsyncOperation>, 'id'> & Pick<AsyncOperation, 'id'>) {
        return operationPatch;
    }
);

const removeOperation = createAction(CONSTANTS.REMOVE_OPERATION, function (operationId: string) {
    return operationId;
});

export const actions = {
    addOrUpdateOperation,
    removeOperation,
};

export type AddOrUpdateAction = ReturnType<typeof addOrUpdateOperation>;
export type RemoveAction = ReturnType<typeof removeOperation>;

const INITIAL_STATE = Map<string, AddOrUpdateAction['payload']>();

export type State = typeof INITIAL_STATE;

export default function asyncOperationsReducer(state = INITIAL_STATE, action: AddOrUpdateAction | RemoveAction) {
    if (!Map.isMap(state)) {
        return Object.entries(state).reduce((map, item) => {
            return map.set(item[0], item[1] as any);
        }, Map<string, AddOrUpdateAction['payload']>());
    }

    if (action.type === CONSTANTS.ADD_OR_UPDATE_OPERATION && action.payload) {
        const id = action.payload.id;

        if (state.has(id)) {
            return state.update(id, function (v) {
                return v ? { ...v, ...action.payload } : v;
            });
        }

        return state.set(id, action.payload);
    }

    if (action.type === CONSTANTS.REMOVE_OPERATION && action.payload) {
        const id = action.payload;

        if (state.has(id)) {
            return state.delete(id);
        }

        return state;
    }

    return state;
}
