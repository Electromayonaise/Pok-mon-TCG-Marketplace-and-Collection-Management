// Page Object base (Impl-2 statement §3, test-design.md §7.4). Every selector of the E2E suite
// lives in a page object; specs call intention-named methods and assert on the locators they
// expose. Locators are role- and label-based, the way a user and assistive technology find them.
import type { Locator, Page } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** The path this page object opens. */
  protected abstract readonly path: string;

  async open(): Promise<void> {
    await this.page.goto(this.path);
  }

  /** The page's main heading (each page has exactly one `h1`). */
  get heading(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  /** The root element, which carries the page language. */
  get document(): Locator {
    return this.page.locator('html');
  }

  /** The polite live region a page announces its state in (`role="status"`). */
  get status(): Locator {
    return this.page.getByRole('status');
  }
}
