// The binder (`/coleccion/<collectionId>`, page 9.1, Story 11.5). The shown page is a list named "Página n de N"; each
// pocket is a list item named by its card, so its text holds the card's name and its source badge. Empty pockets are
// hidden from assistive technology, so they are not pockets here either.
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class BinderPage extends BasePage {
  protected readonly path: string;

  constructor(page: Page, collectionId: string) {
    super(page);
    this.path = `/coleccion/${collectionId}`;
  }

  /** The collection's name and entry count ("Kanto 151 · 3 cartas"). */
  get collectionHeading(): Locator {
    return this.page.getByRole('heading', { level: 2 });
  }

  /** The pockets of the page shown, in binder order. */
  get pockets(): Locator {
    return this.page.getByRole('list', { name: /^Página \d+ de \d+$/ }).getByRole('listitem');
  }

  pocket(title: string): Locator {
    return this.page.getByRole('list', { name: /^Página \d+ de \d+$/ }).getByRole('listitem', { name: title });
  }

  get sortSelect(): Locator {
    return this.page.getByRole('form', { name: 'Organizar' }).getByLabel('Ordenar por');
  }

  /** The live region an add is announced in. */
  get notice(): Locator {
    return this.page.getByRole('status', { name: 'Aviso' });
  }

  async sortBy(label: string): Promise<void> {
    await this.sortSelect.selectOption({ label });
    await this.page.getByRole('form', { name: 'Organizar' }).getByRole('button', { name: 'Ordenar' }).click();
  }

  async addCardByLink(): Promise<void> {
    await this.page.getByRole('link', { name: 'Agregar carta por enlace' }).click();
  }
}
