import type { ReactNode } from 'react';
import {
  unstable_getRscPath as getRscPath,
  unstable_getRscParams as getRscParams,
} from 'waku/router/server';

import { prepareStore } from '../minimal/server.js';
import { RouterSyncAtoms } from './client.js';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const RouterProvider = ({ children }: { children: ReactNode }) => {
  const rscPath = getRscPath() || '';
  const rscParams = getRscParams() || {};
  if (!isObject(rscParams)) {
    throw new Error('rscParams must be an object');
  }
  const { jotai_atomValues: atomValues, ...rest } = rscParams;
  const atomsPromise = prepareStore(atomValues);
  return (
    <>
      {children}
      <RouterSyncAtoms
        atomsPromise={atomsPromise}
        rscPath={rscPath}
        rscParams={rest}
      />
    </>
  );
};
