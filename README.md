# waku-jotai

[Jotai](https://jotai.org) bindings for [Waku](https://waku.gg).

Share a Jotai atom across the RSC boundary: a Server Component can read — and derive from — an atom that a Client Component owns, and **re-render on the server whenever the client changes it.** It's the same atom on both sides; you only mark it with Waku's `allowServer` so its value can cross the wire.

## Install

```bash
npm install waku-jotai
```

`jotai`, `react`, and `waku` are peer dependencies. There is nothing at the package root — import from `waku-jotai/router` (the file-based router) or `waku-jotai/minimal` (the low-level `waku/minimal` API).

## Quick start

For the file-based router.

**1. Mark a client atom with `allowServer`.** It's an ordinary Jotai atom; `allowServer` (from `waku/client`) lets its value be referenced on the server.

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

**2. Wrap your app in `<RouterProvider>`,** typically in a layout.

```tsx
// src/pages/_layout.tsx
import type { ReactNode } from 'react';
import { RouterProvider } from 'waku-jotai/router';

export default function RootLayout({ children }: { children: ReactNode }) {
  return <RouterProvider>{children}</RouterProvider>;
}
```

**3. Read the atom on the server** with `getStore`. A Server Component can read the shared atom directly, or — more usefully — a server-only atom derived from it:

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

The `minimal` entry point is the same idea for Waku's low-level API. You mount `<Provider>` yourself and hand it the request's `rscPath` and `rscParams`:

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

- **`getStore(): Promise<Store>`** — from either entry point. Returns the request-scoped Jotai store for the current render; `await` it in a Server Component and call `store.get(atom)` to read any atom, including server-only derived ones. Memoized per request, so every Server Component in one render shares a single store.
- **`RouterProvider`** (`waku-jotai/router`) — wraps your app and wires up the sync. It reads `rscPath`/`rscParams` from `waku/router/server`, so it takes no props; drop it in a layout.
- **`Provider`** (`waku-jotai/minimal`) — the same, but you pass `rscPath` and `rscParams` explicitly.

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
