import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { unstable_defaultRootOptions as defaultRootOptions } from 'waku/client';
import { Router } from 'waku/router/client';
import { createJotaiIntegration } from 'waku-jotai/router/client';

const jotai = createJotaiIntegration();
const rscEnhancers = [jotai.rscEnhancer];

const rootElement = (
  <StrictMode>
    <jotai.Provider>
      <Router unstable_rscEnhancers={rscEnhancers} />
    </jotai.Provider>
  </StrictMode>
);

if ((globalThis as Record<string, unknown>).__WAKU_HYDRATE__) {
  hydrateRoot(document, rootElement, defaultRootOptions);
} else {
  createRoot(document, defaultRootOptions).render(rootElement);
}
