# waku-jotai

[Jotai](https://jotai.org) bindings for [Waku](https://waku.gg).

Share a Jotai atom across the RSC boundary: a Server Component can read — and derive from — an atom that a Client Component owns, and **re-render on the server whenever the client changes it.** It's the same atom on both sides; you only mark it with Waku's `allowServer` so its value can cross the wire.

## Install

```bash
npm install waku-jotai
```

`jotai`, `react`, and `waku` are peer dependencies; Waku 1.0.0-rc.4 or later is required. Import server APIs from `waku-jotai/router` or `waku-jotai/minimal`, and client integrations from their `/client` entry points.

## Quick start

For the file-based router.

**1. Create the Jotai integration in the client entry.** Mount its Provider around Waku's Router and pass its enhancer to the Router.

```tsx
// src/waku.client.tsx
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { unstable_defaultRootOptions as defaultRootOptions } from 'waku/client';
import { Router } from 'waku/router/client';
import { createJotaiIntegration } from 'waku-jotai/router/client';

const jotai = createJotaiIntegration();
const rscEnhancers = [jotai.rscEnhancer];

const app = (
  <StrictMode>
    <jotai.Provider>
      <Router unstable_rscEnhancers={rscEnhancers} />
    </jotai.Provider>
  </StrictMode>
);
if ((globalThis as Record<string, unknown>).__WAKU_HYDRATE__) {
  hydrateRoot(document, app, defaultRootOptions);
} else {
  createRoot(document, defaultRootOptions).render(app);
}
```

**2. Mark a client atom with `allowServer`.** It's an ordinary Jotai atom; `allowServer` (from `waku/client`) lets its value be referenced on the server.

```tsx
// src/components/counter.tsx
'use client';
import { atom, useAtom } from 'jotai';
import { unstable_allowServer as allowServer } from 'waku/client';

export const countAtom = allowServer(atom(1));

export const Counter = () => {
  const [count, setCount] = useAtom(countAtom);
  return <button onClick={() => setCount((c) => c + 1)}>+{count}</button>;
};
```

**3. Wrap your app in `<RouterProvider>`,** typically in a layout.

```tsx
// src/pages/_layout.tsx
import type { ReactNode } from 'react';
import { RouterProvider } from 'waku-jotai/router';

export default function RootLayout({ children }: { children: ReactNode }) {
  return <RouterProvider>{children}</RouterProvider>;
}
```

**4. Read the atom on the server** with `getStore`. A Server Component can read the shared atom directly, or — more usefully — a server-only atom derived from it:

```tsx
// src/pages/index.tsx
import { atom } from 'jotai/vanilla';
import { getStore } from 'waku-jotai/router';
import { Counter, countAtom } from '../components/counter';

// server-only: derives from the client atom, never ships to the client
const doubleCountAtom = atom((get) => get(countAtom) * 2);

export default async function HomePage() {
  const store = await getStore();
  return (
    <>
      <Counter />
      <p>doubleCount: {store.get(doubleCountAtom)}</p>
    </>
  );
}
```

Click the button and `countAtom` changes on the client. waku-jotai sends the new value with the next RSC request, rebuilds the server store with it, and the Server Component re-renders — so `doubleCount` updates with no extra props and no API route.

The derived atom can be **async**, which is where this earns its keep: read a client atom and do server-only work from it — a query, a fetch, a lookup by id. See `examples/03_search`.

## Minimal

Create the Minimal integration in the client entry and configure Waku's native Root:

```tsx
import {
  Root_UNSTABLE as Root,
  Slot_UNSTABLE as Slot,
} from 'waku/minimal/client';
import { createJotaiIntegration } from 'waku-jotai/minimal/client';

const jotai = createJotaiIntegration();
const rscEnhancers = [jotai.rscEnhancer];

const app = (
  <jotai.Provider>
    <Root rscEnhancers={rscEnhancers}>
      <Slot id="App" />
    </Root>
  </jotai.Provider>
);
```

On the server, mount `<Provider>` and pass the request's `rscPath` and `rscParams`:

```tsx
import { Provider, getStore } from 'waku-jotai/minimal';

const App = ({ rscParams }: { rscParams: unknown }) => (
  <Provider rscPath="" rscParams={rscParams}>
    <MyApp />
  </Provider>
);
```

`getStore` works exactly as above. See `examples/01_minimal`.

## API

- **`createJotaiIntegration(store?)`** (`waku-jotai/minimal/client` or `waku-jotai/router/client`) — returns a client `Provider` and `rscEnhancer` bound to a Jotai store. Creates a store when omitted; pass an existing store to share its state. Use the entry point matching Waku's Root or Router.
- **`getStore(): Promise<Store>`** — from either entry point. Returns the request-scoped Jotai store for the current render; `await` it in a Server Component and call `store.get(atom)` to read any atom, including server-only derived ones. Memoized per request, so every Server Component in one render shares a single store.
- **`RouterProvider`** (`waku-jotai/router`) — wraps your app and wires up the sync. It reads `rscPath`/`rscParams` from `waku/router/server`, so it takes no props; drop it in a layout.
- **`Provider`** (`waku-jotai/minimal`) — the same, but you pass `rscPath` and `rscParams` explicitly.

## Client stores and enhancers

The integration's client Provider supplies its store to descendant Jotai hooks and atom synchronization. It uses the store passed to the factory, or creates an independent store. The server-side Providers prepare the request's server store. Mount both the client integration's Provider and the corresponding server Provider.

Create the integration and enhancer array before rendering React, as in the examples above. Keep both stable across renders, including initial Suspense retries. Remount to change them.

Compose ecosystem libraries through Waku's enhancer array. Later entries wrap earlier ones, so in `[otherEnhancer, jotai.rscEnhancer]`, Jotai patches the request params before `otherEnhancer` receives them. Reverse the order if the other enhancer needs the original params. Providers from other integrations can wrap the same native Root or Router; each library supplies its enhancer rather than replacing that component. Waku Router's private redirect and action enhancers wrap the application enhancers.

Atom discovery metadata belongs to the integration. Roots sharing one integration share that metadata; create separate integrations for independent discovery, even when passing the same store. Unknown RSC paths pass through unchanged until their atoms are discovered. Discovery can finish after a request has started; installing an enhancer does not make atom IDs available before the server reports them. The streamed hydration payload bypasses client enhancers.

Router prefetch caches do not include atom values in their keys. Changing an atom does not invalidate a prefetched result.

## Migrating from 0.7

Call `createJotaiIntegration` from the corresponding `waku-jotai/*/client` entry point in `src/waku.client.tsx`. Wrap Waku's native Root or Router with the returned Provider and add its enhancer to the stable enhancer array. Create that entry file for a file-based Router app that previously used Waku's managed client entry. Keep the server-side `Provider`, `RouterProvider`, and `getStore` imports. Atom subscriptions and development reloads continue to use the server Provider's client companion.

## How it works

`allowServer` gives a client atom a stable id that both sides agree on (the atom itself never crosses the wire). On each render, `getStore()` hands out a fresh, request-scoped store seeded with the client's current atom values, which ride along in `rscParams`. The Provider also renders a small client companion that subscribes to those atoms; when one changes it refetches the current route with the updated values, so anything the server derived from them re-renders.

## Notes

- **State is client-authoritative.** Values flow client → server: the server reads the client's atoms, it does not push values back. Server-only atoms (never wrapped in `allowServer`) stay on the server and can freely derive from the shared ones.
- Only atoms wrapped in `allowServer` are synchronized.

## Examples

- `examples/01_minimal` — the low-level `minimal` API
- `examples/02_router` — the same demo on the file-based router
- `examples/03_search` — server-side search driven by a client query atom

Run one:

```bash
pnpm compile
pnpm examples:02_router
```

## Testing

```sh
pnpm test
pnpm e2e
E2E_MODE=production pnpm e2e
```
