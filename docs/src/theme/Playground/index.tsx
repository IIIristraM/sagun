import React, {useMemo, type ReactNode} from 'react';
import Playground from '@theme-original/Playground';
import type PlaygroundType from '@theme/Playground';
import type {WrapperProps} from '@docusaurus/types';

import getProvider from '@site/src/components/SagunProvider';

type Props = WrapperProps<typeof PlaygroundType>;

export default function PlaygroundWrapper(props: Props): ReactNode {
  const { SagunProvider } = useMemo(() => getProvider(), []);
  
  return (
    <SagunProvider>
      <Playground {...props} />
    </SagunProvider>
  );
}
