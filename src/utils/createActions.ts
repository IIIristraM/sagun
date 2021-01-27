import { Indexed } from '@iiiristram/ts-type-utils';

import { Action, ActionAPI, ResolveActionCreator } from '../types';
import { getClassMethods } from './getKeys';

export function createAction<P extends any[], T extends string, POut>(
    type: T,
    getPayload: (...actionArgs: P) => POut
): (...args: P) => Action<POut, T>;
export function createAction<P, T extends string = string>(type: T): ResolveActionCreator<P, T>;
// implementation
export function createAction(type: string, getPayload?: Function) {
    const actionCreator = getPayload
        ? (...actionArgs: any[]) => {
              return {
                  type,
                  payload: getPayload(...actionArgs),
              };
          }
        : (payload: any) => ({
              type: type,
              payload,
          });

    return Object.assign(actionCreator, {
        toString: () => type,
    });
}

export const createActionType = (apiString: string, methodKey: string) => {
    const apiWords = apiString.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
    const methodWords = methodKey.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
    return apiWords.concat(methodWords).join('_').toUpperCase();
};

export const createActions = <T extends Indexed>(source: T, postfix?: string) => {
    // takes only public methods (private starts with _)
    const methodsKeys = getClassMethods(source);

    return methodsKeys.reduce((actions, methodKey) => {
        const type = createActionType(source.toString(), methodKey);
        const fullType = postfix !== undefined ? `${type}_${postfix}` : type;

        const actionCreator = Object.assign(
            createAction<unknown[], string, unknown>(fullType, (...args) => args),
            {
                method: methodKey,
            }
        );

        return Object.assign(actions, {
            [methodKey]: actionCreator,
        });
    }, {}) as ActionAPI<T>;
};
