import React, { useCallback, useState } from 'react';
import {ErrorBoundaryErrorMessageFallback} from '@docusaurus/theme-common';
import DocusaurusErrorBoundary from '@docusaurus/ErrorBoundary';

import { call } from 'typed-redux-saga';

// Use compiled version from lib/ (src/ has decorators that require special babel config)
import * as sagun from '../../../../lib';

const user = {login: "John Doe"};
function * fetchUser() {
    return yield* call(() => {
        return new Promise(resolve => {
            setTimeout(() => resolve(user), 3000);
        })
    })
}

// Add react-live imports you need here
const ReactLiveScope: Record<string, unknown> = {
  React,
  ...sagun,
  ...React,
  call,
  fetchUser,
};

export default ReactLiveScope;
