// Home (`/`): the entry point of the UI slice.
import type { Locator } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class HomePage extends BasePage {
  protected readonly path = '/';

  get brandLink(): Locator {
    return this.page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'TEZG' });
  }
}
