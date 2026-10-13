import { AlertController } from '@ionic/angular';
import { AppContainer } from '../app.container';
import { t } from './i18n';

/**
 * Pide nombre y apellido en una alerta propia de la app. Con `asking` (a quien ya usaba la app), el botón de
 * cancelar dice "Omitir". Devuelve true si se guardó.
 */
export async function askName(alerts: AlertController, container: AppContainer, asking = false): Promise<boolean> {
  const [first, last] = await Promise.all([container.profile.name(), container.profile.lastName()]);
  const alert = await alerts.create({
    cssClass: 'app-alert',
    header: asking ? t('profile.askTitle') : t('ajustes.nameTitle'),
    message: asking ? t('profile.askMsg') : t('ajustes.nameMsg'),
    inputs: [
      { name: 'first', type: 'text', value: first, placeholder: t('onboarding.firstName'), attributes: { maxlength: 40, autocapitalize: 'words' } },
      { name: 'last', type: 'text', value: last, placeholder: t('onboarding.lastName'), attributes: { maxlength: 40, autocapitalize: 'words' } },
    ],
    buttons: [
      { text: asking ? t('onboarding.skip') : t('common.cancel'), role: 'cancel' },
      { text: t('common.save'), role: 'confirm' },
    ],
  });
  await alert.present();
  const { role, data } = await alert.onDidDismiss();
  if (role !== 'confirm') return false;
  await container.profile.setName(String(data?.values?.first ?? ''));
  await container.profile.setLastName(String(data?.values?.last ?? ''));
  return true;
}
