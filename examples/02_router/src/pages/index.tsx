import { Link } from 'waku';
import { atom } from 'jotai/vanilla';
import { getStore } from 'waku-jotai/router';
import { Counter, countAtom } from '../components/counter';

// server-only atom
const doubleCountAtom = atom(async (get) => {
  await new Promise((r) => setTimeout(r, 100));
  return get(countAtom) * 2;
});

export default async function HomePage() {
  const store = await getStore();
  const doubleCount = store.get(doubleCountAtom);
  const data = await getData();

  return (
    <div>
      <title>{data.title}</title>
      <h1
        style={{
          fontSize: '2.25rem',
          lineHeight: '2.5rem',
          fontWeight: 700,
          letterSpacing: '-0.025em',
        }}
      >
        {data.headline}
      </h1>
      <p>{data.body}</p>
      <Counter />
      <p style={{ marginTop: '1rem' }}>Jotai Count: {store.get(countAtom)}</p>
      <h2>(doubleCount={doubleCount})</h2>
      <Link
        to="/about"
        style={{
          marginTop: '1rem',
          display: 'inline-block',
          textDecoration: 'underline',
        }}
      >
        About page
      </Link>
    </div>
  );
}

const getData = async () => {
  const data = {
    title: 'Waku',
    headline: 'Waku',
    body: 'Hello world!',
  };

  return data;
};

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const;
};
