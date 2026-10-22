import { StrictMode, Suspense, useLayoutEffect } from 'react';
import { renderToString } from 'react-dom/server';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { atom, createStore, useAtom, useAtomValue } from 'jotai';
import type { Atom } from 'jotai';
import type { Unstable_RscEnhancer } from 'waku/minimal/client';
import { createJotaiIntegration } from 'waku-jotai/minimal/client';
import { createJotaiIntegration as createRouterJotaiIntegration } from 'waku-jotai/router/client';
import { SyncAtoms } from '../src/minimal/sync-atoms.js';

type RequestRsc = Parameters<Unstable_RscEnhancer>[0];
const mocks = vi.hoisted(() => ({
  fetchRsc: vi.fn(async (_path: string, _params?: unknown) => ({})),
  mergeElements: vi.fn(async (elements: Promise<unknown>) => elements),
  registerReload: vi.fn(() => () => {}),
}));

vi.mock('waku/minimal/client', () => ({
  useFetchRsc_UNSTABLE: () => mocks.fetchRsc,
  useMergeElements_UNSTABLE: () => mocks.mergeElements,
  useRegisterRscReloadListener_UNSTABLE: () => mocks.registerReload,
}));

const applyEnhancers = (
  enhancers: readonly Unstable_RscEnhancer[],
  next: RequestRsc,
) => enhancers.reduce((request, enhance) => enhance(request), next);
const rscOptions = { type: 'rsc', fetch: globalThis.fetch } as const;

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

test('the server companion renders without a client integration context', () => {
  expect(
    renderToString(
      <SyncAtoms
        atomsPromise={Promise.resolve(new Map())}
        rscPath="page"
        rscParams={{}}
      />,
    ),
  ).toBe('');
});

test('the Provider and enhancer share a store across Strict Mode and initial Suspense retries', async () => {
  const count = atom(1);
  const jotai = createJotaiIntegration();
  const enhancers = [jotai.rscEnhancer];
  const atomsPromise = Promise.resolve(
    new Map<Atom<unknown>, string>([[count, 'count']]),
  );
  let ready = false;
  let resolve: () => void;
  const pending = new Promise<void>((r) => {
    resolve = r;
  });
  const Child = () => {
    const [value, setValue] = useAtom(count);
    if (!ready) throw pending;
    return (
      <button onClick={() => setValue((n) => n + 1)}>count: {value}</button>
    );
  };
  render(
    <StrictMode>
      <Suspense fallback="loading">
        <jotai.Provider>
          <Child />
          <SyncAtoms
            atomsPromise={atomsPromise}
            rscPath="page"
            rscParams={{}}
          />
        </jotai.Provider>
      </Suspense>
    </StrictMode>,
  );
  expect(screen.getByText('loading')).toBeDefined();
  await act(async () => {
    ready = true;
    resolve();
  });
  fireEvent.click(screen.getByRole('button', { name: 'count: 1' }));
  expect(screen.getByRole('button', { name: 'count: 2' })).toBeDefined();
  const next = vi.fn<RequestRsc>(async () => ({ elements: {} }));
  await applyEnhancers(enhancers, next)('page', {}, rscOptions);
  expect(next).toHaveBeenCalledWith(
    'page',
    { jotai_atomValues: new Map([['count', 2]]) },
    rscOptions,
  );
});

test('callers choose which enhancers see synchronized params on a layout-effect request', async () => {
  const count = atom(1);
  const store = createStore();
  const jotai = createJotaiIntegration(store);
  const atomsPromise = Promise.resolve(
    new Map<Atom<unknown>, string>([[count, 'count']]),
  );
  const observed: [string, unknown][] = [];
  const inner: Unstable_RscEnhancer = (next) => (path, params, options) => {
    observed.push(['inner', params]);
    return next(path, params, options);
  };
  const outer: Unstable_RscEnhancer = (next) => (path, params, options) => {
    observed.push(['outer', params]);
    return next(path, params, options);
  };
  const enhancers = [inner, jotai.rscEnhancer, outer];
  const view = render(
    <jotai.Provider>
      <SyncAtoms atomsPromise={atomsPromise} rscPath="page" rscParams={{}} />
    </jotai.Provider>,
  );
  await act(async () => {});
  view.unmount();
  store.set(count, 7);
  expect(mocks.fetchRsc).not.toHaveBeenCalled();
  const next = vi.fn<RequestRsc>(async () => ({
    elements: {},
    value: 'result',
  }));
  const request = applyEnhancers(enhancers, next);
  const Probe = () => {
    const value = useAtomValue(count);
    useLayoutEffect(() => {
      void request('page', { query: 'q=one' }, rscOptions);
    }, []);
    return <p>count: {value}</p>;
  };
  await act(async () => {
    render(
      <jotai.Provider>
        <Probe />
      </jotai.Provider>,
    );
  });
  const patched = {
    query: 'q=one',
    jotai_atomValues: new Map([['count', 7]]),
  };
  expect(screen.getByText('count: 7')).toBeDefined();
  expect(observed).toEqual([
    ['outer', { query: 'q=one' }],
    ['inner', patched],
  ]);
  expect(next).toHaveBeenCalledWith('page', patched, rscOptions);
  const args = ['argument'];
  const result = await request('page', args, { ...rscOptions, type: 'call' });
  expect(next).toHaveBeenLastCalledWith('page', args, {
    ...rscOptions,
    type: 'call',
  });
  expect(result.value).toBe('result');
});

test('default integrations keep client stores and request values isolated', async () => {
  const count = atom(1);
  const atomsPromise = Promise.resolve(
    new Map<Atom<unknown>, string>([[count, 'count']]),
  );
  const first = createJotaiIntegration();
  const second = createJotaiIntegration();
  const Counter = ({ label }: { label: string }) => {
    const [value, setValue] = useAtom(count);
    return (
      <button onClick={() => setValue(5)}>
        {label}: {value}
      </button>
    );
  };
  render(
    <>
      <first.Provider>
        <Counter label="first" />
        <SyncAtoms atomsPromise={atomsPromise} rscPath="page" rscParams={{}} />
      </first.Provider>
      <second.Provider>
        <Counter label="second" />
        <SyncAtoms atomsPromise={atomsPromise} rscPath="page" rscParams={{}} />
      </second.Provider>
    </>,
  );
  await act(async () => {});
  fireEvent.click(screen.getByRole('button', { name: 'first: 1' }));
  expect(screen.getByRole('button', { name: 'first: 5' })).toBeDefined();
  expect(screen.getByRole('button', { name: 'second: 1' })).toBeDefined();
  const next = vi.fn<RequestRsc>(async () => ({ elements: {} }));
  await first.rscEnhancer(next)('page', {}, rscOptions);
  await second.rscEnhancer(next)('page', {}, rscOptions);
  expect(next.mock.calls.map(([, params]) => params)).toEqual([
    { jotai_atomValues: new Map([['count', 5]]) },
    { jotai_atomValues: new Map([['count', 1]]) },
  ]);
});

test('the Router integration preserves the query while synchronizing known routes', async () => {
  const count = atom(1);
  const store = createStore();
  const jotai = createRouterJotaiIntegration(store);
  render(
    <jotai.Provider>
      <SyncAtoms
        atomsPromise={Promise.resolve(
          new Map<Atom<unknown>, string>([[count, 'count']]),
        )}
        rscPath="R/page"
        rscParams={{ query: '' }}
      />
    </jotai.Provider>,
  );
  await act(async () => {});
  await act(async () => {
    store.set(count, 3);
  });
  const next = vi.fn<RequestRsc>(async () => ({ elements: {} }));
  const request = jotai.rscEnhancer(next);
  await request('R/page', new URLSearchParams({ query: 'q=two' }), rscOptions);
  expect(next).toHaveBeenLastCalledWith(
    'R/page',
    { query: 'q=two', jotai_atomValues: new Map([['count', 3]]) },
    rscOptions,
  );
  const unknownParams = new URLSearchParams({ query: 'q=unknown' });
  await request('R/unknown', unknownParams, rscOptions);
  expect(next).toHaveBeenLastCalledWith('R/unknown', unknownParams, rscOptions);
});

test('late atom discovery refetches a value changed before discovery', async () => {
  const count = atom(1);
  const store = createStore();
  const jotai = createJotaiIntegration(store);
  let discover: (atoms: Map<Atom<unknown>, string>) => void;
  const atomsPromise = new Promise<Map<Atom<unknown>, string>>((resolve) => {
    discover = resolve;
  });
  render(
    <jotai.Provider>
      <SyncAtoms
        atomsPromise={atomsPromise}
        rscPath="page"
        rscParams={{ query: 'q=one' }}
      />
    </jotai.Provider>,
  );
  await act(async () => {
    store.set(count, 4);
    discover(new Map([[count, 'count']]));
  });
  expect(mocks.fetchRsc).toHaveBeenCalledTimes(1);
  expect(mocks.fetchRsc).toHaveBeenCalledWith('page', {
    query: 'q=one',
    jotai_atomValues: new Map([['count', 4]]),
  });
});
