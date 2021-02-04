import React from 'react';

import { AsyncOperation, OperationId } from '../types';
import { useOperation } from '../hooks/useOperation';

export function Operation<TRes, TArgs>({
    children,
    operationId,
}: {
    operationId: OperationId<TRes, TArgs>;
    children: (operation: Partial<AsyncOperation<TRes, TArgs>>) => React.ReactNode;
}) {
    const operation = useOperation({ operationId, suspense: true });
    return <>{children(operation)}</>;
}
