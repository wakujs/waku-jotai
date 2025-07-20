export const Footer = () => {
  return (
    <footer
      style={{ padding: '1.5rem', position: 'fixed', bottom: 0, left: 0 }}
    >
      <div>
        visit{' '}
        <a
          href="https://waku.gg/"
          target="_blank"
          rel="noreferrer"
          style={{
            marginTop: '1rem',
            display: 'inline-block',
            textDecoration: 'underline',
          }}
        >
          waku.gg
        </a>{' '}
        to learn more
      </div>
    </footer>
  );
};
