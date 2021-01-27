import React, { useMemo } from 'react';

import { ComponentLifecycleService, OperationService } from '../services';
import { DIContext, getDIContext } from '../context';

export type Props = {
    operationService: OperationService;
    componentLifecycleService: ComponentLifecycleService;
};

export const Root: React.FC<Props> = function Root({ children, operationService, componentLifecycleService }) {
    const context = useMemo(() => getDIContext(), []);
    context.registerService(operationService);
    context.registerService(componentLifecycleService);

    return <DIContext.Provider value={context}>{children}</DIContext.Provider>;
};
