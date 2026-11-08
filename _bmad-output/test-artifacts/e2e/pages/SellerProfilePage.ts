// The public seller profile (`/perfil/<userId>`, page 11.2, Story 13.5): the seller header, the rating summary (its
// average is named "{n} de 5" for assistive technology) and the list of visible reviews, each a list item.
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class SellerProfilePage extends BasePage {
  protected readonly path: string;

  constructor(page: Page, userId: string) {
    super(page);
    this.path = `/perfil/${userId}`;
  }

  /** The seller's kind line under the name ("Vendedor individual", or the verified-shop badge). */
  get kindLine(): Locator {
    return this.page.getByRole('region', { name: 'Vendedor' }).getByRole('paragraph');
  }

  get summary(): Locator {
    return this.page.getByRole('region', { name: 'Calificación' });
  }

  /** The average as its accessible name reads it, "4,5 de 5". */
  average(label: string): Locator {
    return this.summary.getByLabel(label, { exact: true });
  }

  /** The visible reviews, newest first. */
  get reviews(): Locator {
    return this.page.getByRole('list', { name: 'Reseñas' }).getByRole('listitem');
  }

  /** Any text on the page, to prove something is absent. */
  text(content: string): Locator {
    return this.page.getByText(content);
  }

  /** The Not-available page's way out. */
  get catalogLink(): Locator {
    return this.page.getByRole('link', { name: 'Ir al catálogo' });
  }

  /** The Not-available page's message (inside the page, apart from Next's route announcer). */
  get unavailable(): Locator {
    return this.page.getByRole('main').getByRole('alert');
  }
}
