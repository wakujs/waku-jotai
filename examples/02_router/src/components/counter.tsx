'use client';

import { useState, useTransition } from 'react';
import { unstable_allowServer as allowServer } from 'waku/client';
import { atom, useAtom } from 'jotai';

export const countAtom = allowServer(atom(1));

export const Counter = () => {
  const [count, setCount] = useState(0);
  const [jotaiCount, setJotaiCount] = useAtom(countAtom);
  const [isPending, startTransition] = useTransition();

  const handleIncrement = () => setCount((c) => c + 1);
  const handleJotaiIncrement = () => {
    startTransition(() => {
      setJotaiCount((c) => c + 1);
    });
  };

  return (
    <section
      style={{
        marginLeft: '-1rem',
        marginRight: '-1rem',
        marginTop: '1rem',
        borderColor: '#60a5fa',
        borderWidth: '1px',
        borderStyle: 'dashed',
        borderRadius: '0.125rem',
        padding: '1rem',
      }}
    >
      <div>Count: {count}</div>
      <button
        onClick={handleIncrement}
        style={{
          borderRadius: '0.125rem',
          backgroundColor: '#000',
          padding: '0.125rem 0.5rem',
          fontSize: '0.875rem',
          lineHeight: '1.25rem',
          color: '#fff',
        }}
      >
        Increment
      </button>
      <div>Jotai Count: {jotaiCount}</div>
      <button
        onClick={handleJotaiIncrement}
        style={{
          borderRadius: '0.125rem',
          backgroundColor: '#000',
          padding: '0.125rem 0.5rem',
          fontSize: '0.875rem',
          lineHeight: '1.25rem',
          color: '#fff',
        }}
      >
        Jotai Increment{isPending ? '...' : ''}
      </button>
    </section>
  );
};
