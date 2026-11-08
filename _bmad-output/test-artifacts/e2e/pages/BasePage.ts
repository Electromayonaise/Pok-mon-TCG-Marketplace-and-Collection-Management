// Page Object base (Impl-2 statement §3, test-design.md §7.4). Every selector of the E2E suite
// lives in a page object; specs call intention-named methods and assert on the locators they
// expose. Locators are role- and label-based, the way a user and assistive technology find them.
// `expectNoA11yViolations()` runs axe-core's WCAG 2.0 / 2.1 / 2.2 A and AA rules over the page as it stands (NFR-SYS-11,
// decision log Impl-2 #31, #33); a spec calls it once a web-first assertion has settled the state it wants scanned.
import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';

/** The axe-core tags of the WCAG 2.x A and AA success criteria (NFR-SYS-11 targets WCAG 2.2 AA). */
export const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] as const;

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

  /** Asserts that axe-core finds no WCAG 2.x A / AA violation on the page; a failure lists each rule, impact and target. */
  async expectNoA11yViolations(): Promise<void> {
    const { violations } = await new AxeBuilder({ page: this.page }).withTags([...WCAG_AA_TAGS]).analyze();
    const found = violations.map((v) => ({ id: v.id, impact: v.impact ?? 'unknown', help: v.help, targets: v.nodes.map((n) => n.target.join(' ')) }));
    const report = found.map((v) => [`  - ${v.id} (${v.impact}): ${v.help}`, ...v.targets.map((t) => `      ${t}`)].join('\n')).join('\n');
    expect(found, `axe-core found ${found.length} WCAG A/AA violation(s) on ${this.page.url()}:\n${report}`).toEqual([]);
  }
}
