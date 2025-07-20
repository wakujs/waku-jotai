import { Link } from 'waku';

export const Header = () => {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1.5rem',
        position: 'fixed',
        left: 0,
        top: 0,
      }}
    >
      <h2
        style={{
          fontSize: '1.125rem',
          lineHeight: '1.75rem',
          fontWeight: 700,
          letterSpacing: '-0.025em',
        }}
      >
        <Link to="/">Waku starter</Link>
      </h2>
    </header>
  );
};
