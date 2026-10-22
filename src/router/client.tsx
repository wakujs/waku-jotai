'use client';

import type { ComponentProps } from 'react';
import { Router as WakuRouter } from 'waku/router/client';
import { useStore } from 'jotai';
import {
  AtomSyncContext,
  ensureObjectRscParams,
  getAtomSync,
  getRscEnhancers,
} from '../minimal/atom-sync.js';

const ensureRouterRscParams = (params: unknown) =>
  params instanceof URLSearchParams && params.size === 1 && params.has('query')
    ? { query: params.get('query') }
    : ensureObjectRscParams(params);

/**
 * Waku's Router with Jotai request synchronization installed before render.
 * Uses the enclosing Jotai Provider's store, or the default store. Keep custom
 * stores and `unstable_rscEnhancers` arrays stable for the mount, including
 * initial Suspense retries. Remount to change either.
 * The Jotai enhancer wraps the supplied array; Router's private enhancers wrap it.
 * Pair with `RouterProvider` from `waku-jotai/router` in the server tree.
 */
export const Router = ({
  unstable_rscEnhancers,
  ...props
}: ComponentProps<typeof WakuRouter>) => {
  const sync = getAtomSync(useStore(), ensureRouterRscParams);
  return (
    <AtomSyncContext value={sync}>
      <WakuRouter
        {...props}
        unstable_rscEnhancers={getRscEnhancers(sync, unstable_rscEnhancers)}
      />
    </AtomSyncContext>
  );
};
