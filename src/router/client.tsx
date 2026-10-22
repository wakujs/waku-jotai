'use client';

import type { ReactNode } from 'react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import {
  AtomSyncContext,
  createAtomSync,
  ensureObjectRscParams,
} from '../minimal/atom-sync.js';
import type { JotaiIntegration } from '../minimal/atom-sync.js';

export type { JotaiIntegration } from '../minimal/atom-sync.js';

const ensureRouterRscParams = (params: unknown) =>
  params instanceof URLSearchParams && params.size === 1 && params.has('query')
    ? { query: params.get('query') }
    : ensureObjectRscParams(params);

/**
 * Creates a client Provider and RSC enhancer bound to the given Jotai store.
 * Creates a store if omitted. The Provider supplies it to descendant Jotai hooks.
 * Call before rendering React and keep the integration and enhancer array stable
 * across Suspense retries. Mount the Provider around Waku's native Router and
 * include rscEnhancer in its unstable_rscEnhancers array. Later enhancers wrap
 * earlier ones; place Jotai after enhancers that need synchronized params.
 * Pair with the server RouterProvider from waku-jotai/router.
 */
export const createJotaiIntegration = (
  store: ReturnType<typeof createStore> = createStore(),
): JotaiIntegration => {
  const sync = createAtomSync(store, ensureRouterRscParams);
  const Provider = ({ children }: { children?: ReactNode }) => (
    <JotaiProvider store={store}>
      <AtomSyncContext value={sync}>{children}</AtomSyncContext>
    </JotaiProvider>
  );
  return { Provider, rscEnhancer: sync.enhance };
};
