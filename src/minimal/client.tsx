'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  useFetchRsc_UNSTABLE as useFetchRsc,
  useMergeElements_UNSTABLE as useMergeElements,
  useRegisterRscEnhancer_UNSTABLE as useRegisterRscEnhancer,
  useRegisterRscReloadListener_UNSTABLE as useRegisterRscReloadListener,
} from 'waku/minimal/client';
import { atom, useStore } from 'jotai';
import type { Atom } from 'jotai';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const ensureObjectRscParams = (rscParams: unknown): Record<string, unknown> => {
  if (isObject(rscParams)) {
    return rscParams;
  } else {
    throw new Error('rscParams must be an object');
  }
};

const createAtomValuesAtom = (atoms: Map<Atom<unknown>, string>) =>
  atom(
    (get) =>
      new Map<Atom<unknown>, unknown>(
        Array.from(atoms).map(([a]) => [a, get(a)]),
      ),
  );

const patchRscParams = (
  rscParams: Record<string, unknown>,
  atoms: Map<Atom<unknown>, string>,
  atomValues: Map<Atom<unknown>, unknown>,
) => {
  const serializedAtomValues = new Map(
    Array.from(atomValues).map(([a, value]) => [atoms.get(a)!, value]),
  );
  return {
    ...rscParams,
    jotai_atomValues: serializedAtomValues,
  };
};

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
  ensureObject = ensureObjectRscParams,
}: {
  atomsPromise: Promise<Map<Atom<unknown>, string>>;
  rscPath: string;
  rscParams: unknown;
  ensureObject?: (rscParams: unknown) => Record<string, unknown>;
}) => {
  const store = useStore();
  const refetch = useRefetch();
  const registerRscEnhancer = useRegisterRscEnhancer();
  const prevAtomValues = useRef(new Map<Atom<unknown>, unknown>());
  const atomsMap = useRef(
    new Map<
      string, // rscPath
      Map<Atom<unknown>, string> // accumulated atoms (LIMITATION: increasing only)
    >(),
  );
  useEffect(() => {
    const controller = new AbortController();
    atomsPromise.then((atoms) => {
      if (controller.signal.aborted) {
        return;
      }
      let atomsForRscPath = atomsMap.current.get(rscPath);
      if (!atomsForRscPath) {
        atomsForRscPath = new Map();
        atomsMap.current.set(rscPath, atomsForRscPath);
      }
      atoms.forEach((id, atom) => {
        atomsForRscPath.set(atom, id);
      });
      const atomValuesAtom = createAtomValuesAtom(atoms);
      const callback = (atomValues: Map<Atom<unknown>, unknown>) => {
        prevAtomValues.current = atomValues;
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
      // HACK check if atom values have already been changed
      if (
        Array.from(atomValues).some(([a, value]) =>
          prevAtomValues.current.has(a)
            ? prevAtomValues.current.get(a) !== value
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
  }, [store, atomsPromise, refetch, rscPath, rscParams, ensureObject]);
  useEffect(
    () =>
      registerRscEnhancer((requestRsc) => (rscPath, rscParams, options) => {
        const atoms = atomsMap.current.get(rscPath);
        if (atoms?.size) {
          const atomValues = store.get(createAtomValuesAtom(atoms));
          prevAtomValues.current = atomValues;
          rscParams = patchRscParams(
            ensureObject(rscParams),
            atoms,
            atomValues,
          );
        }
        return requestRsc(rscPath, rscParams, options);
      }),
    [store, ensureObject, registerRscEnhancer],
  );
  return null;
};
