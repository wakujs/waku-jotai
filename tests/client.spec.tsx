import { StrictMode, Suspense, useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { atom, createStore, Provider } from 'jotai';
import type { Atom } from 'jotai';
import { Root_UNSTABLE as WakuRoot } from 'waku/minimal/client';
import type { Unstable_RscEnhancer } from 'waku/minimal/client';
import { Router as WakuRouter } from 'waku/router/client';
import { Root } from 'waku-jotai/minimal/client';
import { Router } from 'waku-jotai/router/client';
import { SyncAtoms } from '../src/minimal/sync-atoms.js';

type RequestRsc = Parameters<Unstable_RscEnhancer>[0];
const mocks = vi.hoisted(() => ({
  fetchRsc: vi.fn(async (_path: string, _params?: unknown) => ({})),
  mergeElements: vi.fn(async (elements: Promise<unknown>) => elements),
  registerReload: vi.fn(() => () => {}),
  routerChildren: null as ReactNode,
}));

vi.mock('waku/minimal/client', () => ({
  Root_UNSTABLE: vi.fn(({ children }: { children?: ReactNode }) => children),
  useFetchRsc_UNSTABLE: () => mocks.fetchRsc,
  useMergeElements_UNSTABLE: () => mocks.mergeElements,
  useRegisterRscReloadListener_UNSTABLE: () => mocks.registerReload,
}));
vi.mock('waku/router/client', () => ({
  Router: vi.fn(() => mocks.routerChildren),
}));

const getMinimalPipeline = () =>
  vi.mocked(WakuRoot).mock.calls.at(-1)![0].rscEnhancers!;
const applyEnhancers = (
  enhancers: readonly Unstable_RscEnhancer[],
  next: RequestRsc,
) => enhancers.reduce((request, enhance) => enhance(request), next);
const rscOptions = { type: 'rsc', fetch: globalThis.fetch } as const;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.routerChildren = null;
});
afterEach(cleanup);

test('the server companion renders without a client-root context', () => {
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

test('Root preserves its pipeline across Strict Mode and initial Suspense retries', async () => {
  const store = createStore();
  const custom: readonly Unstable_RscEnhancer[] = [(next) => next];
  let ready = false;
  let resolve: () => void;
  const pending = new Promise<void>((r) => {
    resolve = r;
  });
  const Child = () => {
    if (!ready) throw pending;
    return <p>ready</p>;
  };
  render(
    <StrictMode>
      <Provider store={store}>
        <Suspense fallback="loading">
          <Root initialRscPath="page" rscEnhancers={custom}>
            <Child />
          </Root>
        </Suspense>
      </Provider>
    </StrictMode>,
  );
  expect(screen.getByText('loading')).toBeDefined();
  const pipeline = getMinimalPipeline();
  await act(async () => {
    ready = true;
    resolve();
  });
  expect(screen.getByText('ready')).toBeDefined();
  const calls = vi.mocked(WakuRoot).mock.calls;
  expect(calls.length).toBeGreaterThan(1);
  expect(calls.every(([props]) => props.rscEnhancers === pipeline)).toBe(true);
  expect(calls.at(-1)![0].initialRscPath).toBe('page');
  expect(custom).toHaveLength(1);
});

test('a layout-effect request uses live discovered values after the companion unmounts', async () => {
  const count = atom(1);
  const store = createStore();
  const atomsPromise = Promise.resolve(
    new Map<Atom<unknown>, string>([[count, 'count']]),
  );
  const observed: unknown[] = [];
  const custom: readonly Unstable_RscEnhancer[] = [
    (next) => (path, params, options) => {
      observed.push(params);
      return next(path, params, options);
    },
  ];
  const view = render(
    <Provider store={store}>
      <Root rscEnhancers={custom}>
        <SyncAtoms atomsPromise={atomsPromise} rscPath="page" rscParams={{}} />
      </Root>
    </Provider>,
  );
  await act(async () => {});
  view.unmount();
  store.set(count, 7);
  expect(mocks.fetchRsc).not.toHaveBeenCalled();
  const next = vi.fn<RequestRsc>(async () => ({
    elements: {},
    value: 'result',
  }));
  const Probe = () => {
    useLayoutEffect(() => {
      void applyEnhancers(getMinimalPipeline(), next)(
        'page',
        { query: 'q=one' },
        rscOptions,
      );
    }, []);
    return null;
  };
  await act(async () => {
    render(
      <Provider store={store}>
        <Root rscEnhancers={custom}>
          <Probe />
        </Root>
      </Provider>,
    );
  });
  expect(observed).toEqual([
    { query: 'q=one', jotai_atomValues: new Map([['count', 7]]) },
  ]);
  expect(next).toHaveBeenCalledWith('page', observed[0], rscOptions);
  const args = ['argument'];
  const result = await applyEnhancers(getMinimalPipeline(), next)(
    'page',
    args,
    { ...rscOptions, type: 'call' },
  );
  expect(next).toHaveBeenLastCalledWith('page', args, {
    ...rscOptions,
    type: 'call',
  });
  expect(result.value).toBe('result');
});

test('separate Jotai stores keep request values isolated', async () => {
  const count = atom(1);
  const atomsPromise = Promise.resolve(
    new Map<Atom<unknown>, string>([[count, 'count']]),
  );
  const first = createStore();
  const second = createStore();
  render(
    <Provider store={first}>
      <Root>
        <SyncAtoms atomsPromise={atomsPromise} rscPath="page" rscParams={{}} />
      </Root>
    </Provider>,
  );
  const firstPipeline = getMinimalPipeline();
  render(
    <Provider store={second}>
      <Root>
        <SyncAtoms atomsPromise={atomsPromise} rscPath="page" rscParams={{}} />
      </Root>
    </Provider>,
  );
  const secondPipeline = getMinimalPipeline();
  await act(async () => {});
  await act(async () => {
    first.set(count, 5);
  });
  const next = vi.fn<RequestRsc>(async () => ({ elements: {} }));
  await applyEnhancers(firstPipeline, next)('page', {}, rscOptions);
  await applyEnhancers(secondPipeline, next)('page', {}, rscOptions);
  expect(next.mock.calls.map(([, params]) => params)).toEqual([
    { jotai_atomValues: new Map([['count', 5]]) },
    { jotai_atomValues: new Map([['count', 1]]) },
  ]);
  expect(firstPipeline).not.toBe(secondPipeline);
});

test('Router preserves the query while synchronizing known routes', async () => {
  const count = atom(1);
  const store = createStore();
  mocks.routerChildren = (
    <SyncAtoms
      atomsPromise={Promise.resolve(
        new Map<Atom<unknown>, string>([[count, 'count']]),
      )}
      rscPath="R/page"
      rscParams={{ query: '' }}
    />
  );
  render(
    <Provider store={store}>
      <Router initialRoute={{ path: '/page', query: '', hash: '' }} />
    </Provider>,
  );
  await act(async () => {});
  await act(async () => {
    store.set(count, 3);
  });
  const pipeline = vi.mocked(WakuRouter).mock.calls.at(-1)![0]
    .unstable_rscEnhancers!;
  const next = vi.fn<RequestRsc>(async () => ({ elements: {} }));
  const request = applyEnhancers(pipeline, next);
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
  let discover: (atoms: Map<Atom<unknown>, string>) => void;
  const atomsPromise = new Promise<Map<Atom<unknown>, string>>((resolve) => {
    discover = resolve;
  });
  render(
    <Provider store={store}>
      <Root>
        <SyncAtoms
          atomsPromise={atomsPromise}
          rscPath="page"
          rscParams={{ query: 'q=one' }}
        />
      </Root>
    </Provider>,
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
