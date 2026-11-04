// Inbox and thread (`/mensajes`, page 12.2, Story 9.6). Rows are list items named by the other party; a row's open
// button carries its unread badge in its accessible name ("2 sin leer"), as a screen reader hears it.
import type { Locator } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class InboxPage extends BasePage {
  protected readonly path = '/mensajes';

  /** The total unread count across conversations, muted ones excluded (FR-MSG-8). */
  get totalUnread(): Locator {
    return this.page.getByRole('status', { name: 'Mensajes sin leer en total' });
  }

  /** The live region where a mute's answer is announced. */
  get notice(): Locator {
    return this.page.getByRole('status', { name: 'Aviso' });
  }

  conversation(counterpart: string): Locator {
    return this.page.getByRole('list', { name: 'Conversaciones' }).getByRole('listitem', { name: counterpart });
  }

  /** The button that opens a conversation; its name includes "{n} sin leer" while it has unread messages. */
  openButton(counterpart: string): Locator {
    return this.conversation(counterpart).getByRole('button', { name: new RegExp(`^${counterpart}`) });
  }

  muteButton(counterpart: string): Locator {
    return this.conversation(counterpart).getByRole('button', { name: /^(Silenciar conversación|Dejar de silenciar)$/ });
  }

  /** The open thread's messages, oldest first. */
  get messages(): Locator {
    return this.page.getByRole('region', { name: /^Conversación con / }).getByRole('list', { name: 'Mensajes' }).getByRole('listitem');
  }

  threadHeading(counterpart: string): Locator {
    return this.page.getByRole('region', { name: `Conversación con ${counterpart}` }).getByRole('heading', { level: 2 });
  }

  async openConversation(counterpart: string): Promise<void> {
    await this.openButton(counterpart).click();
  }

  async toggleMute(counterpart: string): Promise<void> {
    await this.muteButton(counterpart).click();
  }
}
