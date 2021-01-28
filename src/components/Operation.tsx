import React, { useContext } from 'react';

import { AsyncOperation, OperationId } from '../types';
import { DisableSsrContext } from '../context';
import { isNodeEnv } from '../utils/isNodeEnv';
import { useOperation } from '../hooks/useOperation';

export function Operation<TRes, TArgs>({
    children,
    operationId,
}: {
    operationId: OperationId<TRes, TArgs>;
    children: (operation: Partial<AsyncOperation<TRes, TArgs>>) => React.ReactNode;
}) {
    const disableSSR = useContext(DisableSsrContext);
    const operation = useOperation({ operationId, suspense: disableSSR ? !isNodeEnv() : true });

    return <>{children(operation)}</>;
}
