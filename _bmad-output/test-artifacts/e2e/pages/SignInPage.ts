// Sign-in (`/ingresar`, Story 9.6): email and password through Better Auth behind the AD-IDN-3 guard.
import type { Locator } from '@playwright/test';
import { BasePage } from './BasePage.js';

export class SignInPage extends BasePage {
  protected readonly path = '/ingresar';

  /** The sign-in form; its controls are found inside it, apart from the header's links and Next's route announcer. */
  get form(): Locator {
    return this.page.getByRole('form', { name: 'Ingresar a TEZG' });
  }

  get email(): Locator {
    return this.form.getByLabel('Correo electrónico');
  }

  get password(): Locator {
    return this.form.getByLabel('Contraseña');
  }

  get submit(): Locator {
    return this.form.getByRole('button', { name: 'Ingresar' });
  }

  /** The form's refusal (wrong credentials, the throttle's retry time), announced as an alert. */
  get error(): Locator {
    return this.form.getByRole('alert');
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
