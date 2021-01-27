import { getDefaultContext, SsrContext } from '../context';
import React, { Suspense as SuspenseBase, SuspenseProps, useContext, useMemo } from 'react';

export function Suspense(props: SuspenseProps & { prefix?: string }) {
    const { children, prefix, ...rest } = props;
    const context = useContext(SsrContext);
    const newContext = useMemo(() => {
        return {
            ...getDefaultContext({
                prefix,
            }),
            parentID: `${context?.generator.seed() || 0}`,
        };
    }, [context]);

    return (
        <SsrContext.Provider value={newContext}>
            <SuspenseBase {...rest}>{children}</SuspenseBase>
        </SsrContext.Provider>
    );
}
