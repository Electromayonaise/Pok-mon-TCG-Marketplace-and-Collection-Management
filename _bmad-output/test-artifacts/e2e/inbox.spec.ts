// E2E — Story 9.6, page 12.2 (Flow E, decision log Impl-2 #15): Camila signs in, reads her inbox, opens a
// conversation, sees its unread badge clear and the total drop, and mutes another conversation so the total leaves
// it out. The rules themselves (the clamp, monotonic read marks, mute) are proven below this level (ATDD); this
// journey proves the pages wire them together.
import { expect, test } from '@playwright/test';
import { InboxPage } from './pages/InboxPage.js';
import { SignInPage } from './pages/SignInPage.js';
import { BUYER, seedInbox, SHOPS } from './support/inbox-seed.js';

test.beforeEach(async () => {
  await seedInbox();
});

test('Camila reads a conversation, its badge clears, and muting another takes it out of her unread total', async ({ page }) => {
  const signIn = new SignInPage(page);
  const inbox = new InboxPage(page);

  // Given she is not signed in, the inbox sends her to sign in.
  await inbox.open();
  await expect(signIn.heading).toHaveText('Ingresar');

  // When she signs in, she lands on her inbox with 2 unread messages in each conversation.
  await signIn.signIn(BUYER.email, BUYER.password);
  await expect(inbox.heading).toHaveText('Mensajes');
  await expect(inbox.totalUnread).toHaveText('4');
  await expect(inbox.openButton(SHOPS.andres.name)).toHaveAccessibleName(/2 sin leer/);
  await expect(inbox.openButton(SHOPS.paradise.name)).toHaveAccessibleName(/2 sin leer/);

  // When she opens the conversation with Cartas Andrés, she sees its three messages, and it is read up to the last one.
  await inbox.openConversation(SHOPS.andres.name);
  await expect(inbox.threadHeading(SHOPS.andres.name)).toHaveText(SHOPS.andres.name);
  await expect(inbox.messages).toHaveCount(3);
  await expect(inbox.messages.last()).toContainText('Le puedo enviar fotos por aquí mismo.');
  await expect(inbox.openButton(SHOPS.andres.name)).not.toHaveAccessibleName(/sin leer/);
  await expect(inbox.totalUnread).toHaveText('2');

  // When she mutes the other conversation, the total leaves it out, and the page says so.
  await inbox.toggleMute(SHOPS.paradise.name);
  await expect(inbox.notice).toHaveText('Silenciaste esta conversación.');
  await expect(inbox.totalUnread).toHaveText('0');
  await expect(inbox.muteButton(SHOPS.paradise.name)).toHaveText('Dejar de silenciar');

  // And the read mark and the mute are the server's: a reload shows the same state.
  await page.reload();
  await expect(inbox.totalUnread).toHaveText('0');
  await expect(inbox.openButton(SHOPS.andres.name)).not.toHaveAccessibleName(/sin leer/);
});

test('a wrong password keeps Camila on the sign-in page with the es-CO error', async ({ page }) => {
  const signIn = new SignInPage(page);
  await signIn.open();
  await signIn.signIn(BUYER.email, 'una-clave-equivocada');
  await expect(signIn.error).toHaveText('El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.');
  await expect(signIn.heading).toHaveText('Ingresar');
});
