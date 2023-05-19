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
        ? function (...actionArgs: any[]) {
              return {
                  type,
                  payload: getPayload(...actionArgs),
              };
          }
        : function (payload: any) {
              return {
                  type: type,
                  payload,
              };
          };

    return Object.assign(actionCreator, {
        toString: function () {
            return type;
        },
    });
}

export function createActionType(apiString: string, methodKey: string) {
    const apiWords = apiString.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
    const methodWords = methodKey.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
    return apiWords.concat(methodWords).join('_').toUpperCase();
}

export function createActions<T extends {}>(source: T, postfix?: string) {
    // takes only public methods (private starts with _)
    const methodsKeys = getClassMethods(source);

    function keyReducer(actions: Record<string, unknown>, methodKey: string) {
        const type = createActionType(source.toString(), methodKey);
        const fullType = postfix !== undefined ? `${type}_${postfix}` : type;
        actions[methodKey] = createAction<unknown[], string, unknown>(fullType, (...args) => args);
        return actions;
    }

    return methodsKeys.reduce(keyReducer, {}) as ActionAPI<T>;
}
