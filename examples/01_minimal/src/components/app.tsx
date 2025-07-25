import { Suspense } from 'react';
import { atom } from 'jotai/vanilla';

import { getStore, Provider } from 'waku-jotai/minimal';
import { Counter, countAtom } from './counter';

// server-only atom
const doubleCountAtom = atom(async (get) => {
  await new Promise((r) => setTimeout(r, 1000));
  return get(countAtom) * 2;
});

const MyApp = async ({ name }: { name: string }) => {
  const store = await getStore();
  const doubleCount = store.get(doubleCountAtom);
  return (
    <html lang="en">
      <head>
        <title>Waku</title>
      </head>
      <body>
        <div
          style={{ border: '3px red dashed', margin: '1em', padding: '1em' }}
        >
          <h1>Hello {name}!!</h1>
          <h2>(doubleCount={doubleCount})</h2>
          <h3>This is a server component.</h3>
          <Counter />
          <div>{new Date().toISOString()}</div>
        </div>
      </body>
    </html>
  );
};

const App = ({ name, rscParams }: { name: string; rscParams: unknown }) => {
  return (
    <Provider rscPath="" rscParams={rscParams}>
      <Suspense fallback="Loading...">
        <MyApp name={name} />
      </Suspense>
    </Provider>
  );
};

export default App;
