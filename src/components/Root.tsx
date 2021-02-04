import React, { useMemo } from 'react';

import { ComponentLifecycleService, OperationService } from '../services';
import { DIContext, getDIContext } from '../context';
import { UUIDGenerator } from '../services/UUIDGenerator';

export type Props = {
    operationService: OperationService;
    componentLifecycleService: ComponentLifecycleService;
};

function createDIContext() {
    return getDIContext();
}

export const Root: React.FC<Props> = function Root({ children, operationService, componentLifecycleService }) {
    const context = useMemo(createDIContext, []);
    context.registerService(new UUIDGenerator());
    context.registerService(operationService);
    context.registerService(componentLifecycleService);

    return <DIContext.Provider value={context}>{children}</DIContext.Provider>;
};
