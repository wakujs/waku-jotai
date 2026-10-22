import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { unstable_defaultRootOptions as defaultRootOptions } from 'waku/client';
import {
  Root_UNSTABLE as Root,
  Slot_UNSTABLE as Slot,
} from 'waku/minimal/client';
import { createJotaiIntegration } from 'waku-jotai/minimal/client';

const jotai = createJotaiIntegration();
const rscEnhancers = [jotai.rscEnhancer];

const rootElement = (
  <StrictMode>
    <jotai.Provider>
      <Root rscEnhancers={rscEnhancers}>
        <Slot id="App" />
      </Root>
    </jotai.Provider>
  </StrictMode>
);

if ((globalThis as Record<string, unknown>).__WAKU_HYDRATE__) {
  hydrateRoot(document, rootElement, defaultRootOptions);
} else {
  createRoot(document, defaultRootOptions).render(rootElement);
}
