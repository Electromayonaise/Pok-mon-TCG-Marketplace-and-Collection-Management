// The owner's collections (`/coleccion`, page 9.1, Story 11.5): a list named "Colecciones", each item a link to its
// binder followed by its entry count.
import type { Locator } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class CollectionsPage extends BasePage {
  protected readonly path = '/coleccion';

  collection(name: string): Locator {
    return this.page.getByRole('list', { name: 'Colecciones' }).getByRole('listitem').filter({ has: this.page.getByRole('link', { name }) });
  }
}
