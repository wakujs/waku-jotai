import { createContext } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { Unstable_RscEnhancer } from 'waku/minimal/client';
import { atom } from 'jotai';
import type { Atom, createStore } from 'jotai';

type Store = ReturnType<typeof createStore>;
type EnsureObject = (params: unknown) => Record<string, unknown>;
type AtomEntry = {
  atoms: Map<Atom<unknown>, string>;
  values: Map<Atom<unknown>, unknown>;
};
type AtomSync = {
  store: Store;
  ensureObject: EnsureObject;
  atomsMap: Map<string, AtomEntry>;
  enhance: Unstable_RscEnhancer;
};

export type JotaiIntegration = {
  Provider: ComponentType<{ children?: ReactNode }>;
  rscEnhancer: Unstable_RscEnhancer;
};

export const AtomSyncContext = createContext<AtomSync | null>(null);

export const ensureObjectRscParams = (
  params: unknown,
): Record<string, unknown> => {
  if (params === undefined) return {};
  if (typeof params === 'object' && params !== null)
    return params as Record<string, unknown>;
  throw new Error('rscParams must be an object');
};

export const createAtomValuesAtom = (atoms: Map<Atom<unknown>, string>) =>
  atom((get) => new Map(Array.from(atoms, ([a]) => [a, get(a)])));

export const patchRscParams = (
  params: Record<string, unknown>,
  atoms: Map<Atom<unknown>, string>,
  values: Map<Atom<unknown>, unknown>,
) => ({
  ...params,
  jotai_atomValues: new Map(
    Array.from(values, ([a, value]) => [atoms.get(a)!, value]),
  ),
});

export const createAtomSync = (
  store: Store,
  ensureObject: EnsureObject,
): AtomSync => {
  const atomsMap = new Map<string, AtomEntry>();
  return {
    store,
    ensureObject,
    atomsMap,
    enhance: (next) => (path, params, options) => {
      const entry = options.type === 'rsc' ? atomsMap.get(path) : undefined;
      if (entry?.atoms.size) {
        const values = store.get(createAtomValuesAtom(entry.atoms));
        values.forEach((value, atom) => entry.values.set(atom, value));
        params = patchRscParams(ensureObject(params), entry.atoms, values);
      }
      return next(path, params, options);
    },
  };
};
