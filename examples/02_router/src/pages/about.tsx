import { Link } from 'waku';

export default async function AboutPage() {
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
      <Link
        to="/"
        style={{
          marginTop: '1rem',
          display: 'inline-block',
          textDecoration: 'underline',
        }}
      >
        Return home
      </Link>
    </div>
  );
}

const getData = async () => {
  const data = {
    title: 'About',
    headline: 'About Waku',
    body: 'The minimal React framework',
  };

  return data;
};

export const getConfig = async () => {
  return {
    render: 'static',
  } as const;
};
