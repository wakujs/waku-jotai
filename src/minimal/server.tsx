import { cache } from 'react';
import type { ReactNode } from 'react';
import type { Atom } from 'jotai/vanilla';
import {
  INTERNAL_buildStoreRev2 as buildStore,
  INTERNAL_getBuildingBlocksRev2 as getBuildingBlocks,
  INTERNAL_initializeStoreHooksRev2 as initializeStoreHooks,
} from 'jotai/vanilla/internals';

import { SyncAtoms } from './client.js';

const CLIENT_REFERENCE_TAG = Symbol.for('react.client.reference');

type ClientReferenceId = string;

const getClientReferenceId = (a: Atom<unknown>) => {
  if (
    (a as unknown as { $$typeof: unknown })['$$typeof'] === CLIENT_REFERENCE_TAG
  ) {
    const id = (a as unknown as { $$id: ClientReferenceId })['$$id'];
    return id;
  }
  return null;
};

type Store = ReturnType<typeof buildStore>;

const createStorePromise = cache(() => {
  let resolveStore: ((store: Store) => void) | undefined;
  const storePromise = new Promise<Store>((resolve) => {
    resolveStore = resolve;
  });
  return { resolveStore: resolveStore!, storePromise };
});

export const getStore = () => {
  const { storePromise } = createStorePromise();
  return storePromise;
};

const ensureMap = (value: unknown) =>
  value instanceof Map ? value : new Map();

export const prepareStore = (atomValues: unknown) => {
  const clientAtomValues = ensureMap(atomValues);
  const clientAtoms = new Map<Atom<unknown>, ClientReferenceId>();

  const store = buildStore();
  const buildingBlocks = getBuildingBlocks(store);
  const atomStateMap = buildingBlocks[0];
  const storeHooks = initializeStoreHooks(buildingBlocks[6]);
  storeHooks.i.add(undefined, (atom) => {
    const id = getClientReferenceId(atom);
    if (id) {
      clientAtoms.set(atom, id);
      if (clientAtomValues.has(id)) {
        const atomState = atomStateMap.get(atom);
        if (atomState) {
          atomState.v = clientAtomValues.get(id);
        }
      }
    }
  });
  const { resolveStore } = createStorePromise();
  resolveStore(store);
  let resolveAtoms: (m: Map<Atom<unknown>, string>) => void;
  const atomsPromise = new Promise<Map<Atom<unknown>, string>>((r) => {
    resolveAtoms = r;
  });
  setTimeout(async () => {
    let size: number;
    do {
      size = clientAtoms.size;
      await Promise.all(
        Array.from(clientAtoms.keys()).map((a) => atomStateMap.get(a)?.v),
      );
    } while (size !== clientAtoms.size);
    resolveAtoms(clientAtoms);
  });
  return atomsPromise;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const Provider = ({
  children,
  rscPath,
  rscParams = {},
}: {
  children: ReactNode;
  rscPath: string;
  rscParams: unknown;
}) => {
  if (!isObject(rscParams)) {
    throw new Error('rscParams must be an object');
  }
  const { jotai_atomValues: atomValues, ...rest } = rscParams;
  const atomsPromise = prepareStore(atomValues);
  return (
    <>
      {children}
      <SyncAtoms
        atomsPromise={atomsPromise}
        rscPath={rscPath}
        rscParams={rest}
      />
    </>
  );
};
