import { atom } from 'jotai/vanilla';
import { getStore } from 'waku-jotai/router';
import { Search, queryAtom } from '../components/search';

// server-only data: never shipped to the client bundle
const FRUITS = [
  'Apple',
  'Apricot',
  'Avocado',
  'Banana',
  'Blackberry',
  'Blueberry',
  'Cherry',
  'Coconut',
  'Cranberry',
  'Date',
  'Fig',
  'Grape',
  'Grapefruit',
  'Kiwi',
  'Lemon',
  'Lime',
  'Mango',
  'Melon',
  'Orange',
  'Papaya',
  'Peach',
  'Pear',
  'Pineapple',
  'Plum',
  'Raspberry',
  'Strawberry',
  'Tomato',
  'Watermelon',
];

// server-only atom: filters the dataset by the client-owned query atom
const resultsAtom = atom(async (get) => {
  const query = get(queryAtom).trim().toLowerCase();
  await new Promise((r) => setTimeout(r, 500));
  return query
    ? FRUITS.filter((name) => name.toLowerCase().includes(query))
    : FRUITS;
});

export default async function HomePage() {
  const store = await getStore();
  const results = await store.get(resultsAtom);

  return (
    <div>
      <title>Waku jotai search</title>
      <h1
        style={{
          fontSize: '2.25rem',
          lineHeight: '2.5rem',
          fontWeight: 700,
          letterSpacing: '-0.025em',
        }}
      >
        Server-side search
      </h1>
      <p>
        The query lives in a client atom; the list below is filtered on the
        server and streamed back as you type.
      </p>
      <Search />
      <p style={{ marginTop: '1rem' }}>
        {results.length} of {FRUITS.length} fruits
      </p>
      <ul>
        {results.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </div>
  );
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const;
};
