import { useContext } from 'react';

import { DIContext } from '../context';

export function useDI() {
    const diContext = useContext(DIContext);
    if (!diContext) {
        throw new Error('DIContext required');
    }

    return diContext;
}
