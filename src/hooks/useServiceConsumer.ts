import { useStore } from 'react-redux';

import { BaseService } from '../services/BaseService';
import { createServiceActions } from '../services';
import { useDI } from './useDI';

export function useServiceConsumer<T extends BaseService<any, any>>(Ctr: new (...args: any[]) => T) {
    const diContext = useDI();

    const service = diContext.getService(Ctr);
    const store = useStore();
    const actions = createServiceActions(service, store);

    return { service, actions };
}
