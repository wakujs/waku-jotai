'use client';

import { useCallback, useContext, useEffect } from 'react';
import {
  useFetchRsc_UNSTABLE as useFetchRsc,
  useMergeElements_UNSTABLE as useMergeElements,
  useRegisterRscReloadListener_UNSTABLE as useRegisterRscReloadListener,
} from 'waku/minimal/client';
import type { Atom } from 'jotai';

import {
  AtomSyncContext,
  createAtomValuesAtom,
  patchRscParams,
} from './atom-sync.js';

const useRefetch = () => {
  const fetchRsc = useFetchRsc();
  const mergeElements = useMergeElements();
  const registerRscReloadListener = useRegisterRscReloadListener();
  return useCallback(
    (rscPath: string, rscParams?: unknown) => {
      const refetch = () => mergeElements(fetchRsc(rscPath, rscParams));
      registerRscReloadListener(
        () => {
          void refetch();
        },
        { replace: true },
      );
      return refetch();
    },
    [fetchRsc, mergeElements, registerRscReloadListener],
  );
};

export const SyncAtoms = ({
  atomsPromise,
  rscPath,
  rscParams,
}: {
  atomsPromise: Promise<Map<Atom<unknown>, string>>;
  rscPath: string;
  rscParams: unknown;
}) => {
  const sync = useContext(AtomSyncContext);
  const refetch = useRefetch();
  useEffect(() => {
    if (!sync) {
      throw new Error(
        'Use Root from waku-jotai/minimal/client or Router from waku-jotai/router/client.',
      );
    }
    const { store, ensureObject, atomsMap } = sync;
    const controller = new AbortController();
    atomsPromise.then((atoms) => {
      if (controller.signal.aborted) {
        return;
      }
      const entry = atomsMap.get(rscPath) ?? {
        atoms: new Map(),
        values: new Map(),
      };
      atomsMap.set(rscPath, entry);
      const values = entry.values;
      atoms.forEach((id, atom) => {
        entry.atoms.set(atom, id);
      });
      const atomValuesAtom = createAtomValuesAtom(atoms);
      const callback = (atomValues: Map<Atom<unknown>, unknown>) => {
        atomValues.forEach((value, atom) => values.set(atom, value));
        const newRscParams = patchRscParams(
          ensureObject(rscParams),
          atoms,
          atomValues,
        );
        refetch(rscPath, newRscParams);
      };
      const unsub = store.sub(atomValuesAtom, () => {
        callback(store.get(atomValuesAtom));
      });
      const atomValues = store.get(atomValuesAtom);
      if (
        Array.from(atomValues).some(([a, value]) =>
          values.has(a)
            ? values.get(a) !== value
            : 'init' in a && a.init !== value,
        )
      ) {
        callback(atomValues);
      }
      controller.signal.addEventListener('abort', () => {
        unsub();
      });
    });
    return () => controller.abort();
  }, [sync, atomsPromise, refetch, rscPath, rscParams]);
  return null;
};
