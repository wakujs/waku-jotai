import adapter from 'waku/adapters/default';
import { Slot_UNSTABLE as Slot } from 'waku/minimal/client';
import App from './components/app';

export default adapter({
  handleRequest: async (input, { renderRsc, renderHtml }) => {
    if (input.type === 'rsc') {
      return renderRsc({
        App: <App name={input.rscPath || 'Waku'} rscParams={input.rscParams} />,
      });
    }
    if (input.type === 'http' && input.pathname === '/') {
      return renderHtml(
        await renderRsc({ App: <App name="Waku" rscParams={undefined} /> }),
        <Slot id="App" />,
        { rscPath: '' },
      );
    }
  },
  handleBuild: async () => {},
});
