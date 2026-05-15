if (typeof globalThis !== 'undefined' && !('global' in globalThis)) {
  (globalThis as typeof globalThis & { global?: typeof globalThis }).global = globalThis;
}

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import 'aos/dist/aos.css';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
