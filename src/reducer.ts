import { Indexed } from '@iiiristram/ts-type-utils';

import { AsyncOperation } from './types';
import { createAction } from './utils/createActions';

const CONSTANTS = {
    ADD_OR_UPDATE_OPERATION: '@sagun/ADD_OR_UPDATE_OPERATION' as const,
    REMOVE_OPERATION: '@sagun/REMOVE_OPERATION' as const,
};

const addOrUpdateOperation = createAction(
    CONSTANTS.ADD_OR_UPDATE_OPERATION,
    (operationPatch: Omit<Partial<AsyncOperation>, 'id'> & Pick<AsyncOperation, 'id'>) => operationPatch
);

const removeOperation = createAction(CONSTANTS.REMOVE_OPERATION, (operationId: string) => operationId);

export const actions = {
    addOrUpdateOperation,
    removeOperation,
};

export type AddOrUpdateAction = ReturnType<typeof addOrUpdateOperation>;
export type RemoveAction = ReturnType<typeof removeOperation>;

export type State = Indexed<AddOrUpdateAction['payload'] | undefined>;

const INITIAL_STATE: State = {};

export default (state = INITIAL_STATE, action: AddOrUpdateAction | RemoveAction) => {
    if (action.type === CONSTANTS.ADD_OR_UPDATE_OPERATION && action.payload) {
        const id = action.payload.id;

        return {
            ...state,
            [id]: { ...state[id], ...action.payload },
        };
    }

    if (action.type === CONSTANTS.REMOVE_OPERATION && action.payload) {
        const id = action.payload;
        delete state[id];
        return { ...state };
    }

    return state;
};
