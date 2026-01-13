import React, {type ReactNode} from 'react';
import {LiveProvider} from 'react-live';
import {usePrismTheme} from '@docusaurus/theme-common';
import {transform, availablePlugins} from '@babel/standalone';

import type {Props} from '@theme/Playground/Provider';

// Transform code using Babel with decorators support
const babelTransformCode = (code: string): string => {
  try {
      const result = transform(code, {
          presets: ['react'],
          plugins: [
              [availablePlugins['proposal-decorators'], { legacy: true }],
              [availablePlugins['proposal-class-properties'], { loose: true }],
          ],
          filename: 'playground.tsx',
          });
      return result.code || code;
  } catch (error) {
      // Return original code if transformation fails
      // react-live will show the error
      console.error('Babel transform error:', error);
      return code;
  }
};

export default function PlaygroundProvider({
  code,
  children,
  transformCode,
  ...props
}: Props): ReactNode {
  const prismTheme = usePrismTheme();
  const noInline = props.metastring?.includes('noInline') ?? false;

  const combinedTransformCode = (inputCode: string): string => {
    const babelResult = babelTransformCode(inputCode);
    if (transformCode) {
        return transformCode(babelResult);
    }
    return `${babelResult};`;
};

  return (
    <LiveProvider
      noInline={noInline}
      theme={prismTheme}
      {...props}
      code={code?.replace(/\n$/, '')}
      transformCode={combinedTransformCode}>
      {children}
    </LiveProvider>
  );
}
