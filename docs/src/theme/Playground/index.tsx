import React, {type ReactNode} from 'react';
import Playground from '@theme-original/Playground';
import type PlaygroundType from '@theme/Playground';
import type {WrapperProps} from '@docusaurus/types';

import SagunProvider from '@site/src/components/SagunProvider';

type Props = WrapperProps<typeof PlaygroundType>;

export default function PlaygroundWrapper(props: Props): ReactNode {
  return (
    <SagunProvider>
      <Playground {...props} />
    </SagunProvider>
  );
}
