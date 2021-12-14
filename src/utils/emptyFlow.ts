import { Gen } from '../types';

export const emptyFlow = function* (): Gen<void> {
    return yield Promise.resolve();
};
