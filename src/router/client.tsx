'use client';

import type { Atom } from 'jotai';
import { SyncAtoms } from '../minimal/client.js';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const ensureObjectRscParams = (rscParams: unknown): Record<string, unknown> => {
  if (
    // waku/router convention
    rscParams instanceof URLSearchParams &&
    rscParams.size === 1 &&
    rscParams.has('query')
  ) {
    return { query: rscParams.get('query') };
  } else if (isObject(rscParams)) {
    return rscParams;
  } else {
    throw new Error('rscParams must be an object');
  }
};

export const RouterSyncAtoms = ({
  atomsPromise,
  rscPath,
  rscParams,
}: {
  atomsPromise: Promise<Map<Atom<unknown>, string>>;
  rscPath: string;
  rscParams: unknown;
}) => (
  <SyncAtoms
    atomsPromise={atomsPromise}
    rscPath={rscPath}
    rscParams={rscParams}
    ensureObject={ensureObjectRscParams}
  />
);
