import { useMemo } from 'react';

import { OperationId } from '../types';
import { SSRContext } from '../context';
import { uuid } from '../utils/uuid';

export function useOperationId<T extends OperationId<any>>(context: SSRContext | null) {
    return useMemo(() => {
        if (!context) {
            return uuid() as T;
        }

        const { parentID, generator, prefix } = context;
        const uid = generator.getUID();

        const id = parentID ? `${parentID}.${uid}` : `${uid}`;
        return (prefix ? `${prefix}_${id}` : id) as T;
    }, []);
}
