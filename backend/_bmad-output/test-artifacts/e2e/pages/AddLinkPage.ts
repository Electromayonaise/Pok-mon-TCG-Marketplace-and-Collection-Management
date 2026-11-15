// Add a card by its link (`/coleccion/<collectionId>/agregar`, page 9.2 "Por enlace", Story 11.5). A refused field
// carries its es-CO error as its accessible description, the way a screen reader hears it.
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class AddLinkPage extends BasePage {
  protected readonly path: string;

  constructor(page: Page, collectionId: string) {
    super(page);
    this.path = `/coleccion/${collectionId}/agregar`;
  }

  get form(): Locator {
    return this.page.getByRole('form', { name: 'Agregar carta por enlace' });
  }

  get url(): Locator {
    return this.form.getByLabel('Enlace de la carta');
  }

  get title(): Locator {
    return this.form.getByLabel('Nombre de la carta');
  }

  get submit(): Locator {
    return this.form.getByRole('button', { name: /^Agregar a «/ });
  }

  async addLink(url: string, title: string): Promise<void> {
    await this.url.fill(url);
    await this.title.fill(title);
    await this.submit.click();
  }
}
