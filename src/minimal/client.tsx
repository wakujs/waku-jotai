'use client';

import type { ComponentProps } from 'react';
import { Root_UNSTABLE as WakuRoot } from 'waku/minimal/client';
import { useStore } from 'jotai';
import {
  AtomSyncContext,
  ensureObjectRscParams,
  getAtomSync,
  getRscEnhancers,
} from './atom-sync.js';

/**
 * Waku's Minimal Root with Jotai request synchronization installed before render.
 * Uses the enclosing Jotai Provider's store, or the default store. Keep custom
 * stores and `rscEnhancers` arrays stable for the mount, including initial
 * Suspense retries. Remount to change either.
 * The Jotai enhancer wraps the supplied array; other props pass through to Root.
 * Pair with `Provider` from `waku-jotai/minimal` in the server tree.
 */
export const Root = ({
  rscEnhancers,
  ...props
}: ComponentProps<typeof WakuRoot>) => {
  const sync = getAtomSync(useStore(), ensureObjectRscParams);
  return (
    <AtomSyncContext value={sync}>
      <WakuRoot {...props} rscEnhancers={getRscEnhancers(sync, rscEnhancers)} />
    </AtomSyncContext>
  );
};
