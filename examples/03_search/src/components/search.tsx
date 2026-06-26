'use client';

import { useState, useTransition } from 'react';
import { unstable_allowServer as allowServer } from 'waku/client';
import { atom, useSetAtom } from 'jotai';

export const queryAtom = allowServer(atom(''));

export const Search = () => {
  const setQuery = useSetAtom(queryAtom);
  const [text, setText] = useState('');
  const [isPending, startTransition] = useTransition();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '1rem',
      }}
    >
      <input
        type="search"
        name="query"
        value={text}
        placeholder="Search fruits…"
        onChange={(event) => {
          const value = event.target.value;
          setText(value);
          startTransition(() => {
            setQuery(value);
          });
        }}
        style={{
          borderColor: '#60a5fa',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderRadius: '0.25rem',
          padding: '0.25rem 0.5rem',
        }}
      />
      <span style={{ color: '#60a5fa' }}>{isPending ? 'Searching…' : ''}</span>
    </div>
  );
};
