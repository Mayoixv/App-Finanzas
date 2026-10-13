import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TourService } from '../tour/tour.service';
import { HelpService } from '../help/help-button.component';
import { HELP, HELP_TOPICS, HelpTopic } from '../help/help.content';
import { AlertController, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmark, chevronBack, chevronDown, chevronForward, helpCircleOutline } from 'ionicons/icons';
import { APP_CONTAINER } from '../../app.container';
import { Currency } from '../../domain/currency';
import { CurrencyState } from '../currency-state';
import { DropdownComponent } from '../dropdown.component';
import { MonthState } from '../month-state';
import { DatosComponent } from './datos.component';
import { AvisosComponent } from './avisos.component';
import { APP_VERSION } from '../../version';
import { UpdateService } from '../update/update.service';
import { NewsService } from '../news/news.service';
import { PillOption, PillToggleComponent } from '../pill-toggle.component';
import { Appearance, appearance as savedAppearance, setAppearance } from '../theme';

@Component({
  selector: 'app-ajustes',
  templateUrl: 'ajustes.page.html',
  styleUrls: ['ajustes.page.scss'],
  imports: [RouterLink, IonContent, IonIcon, PillToggleComponent, DropdownComponent, DatosComponent, AvisosComponent],
})
export class AjustesPage {
  private readonly container = inject(APP_CONTAINER);
  private readonly monthState = inject(MonthState);
  protected readonly currencyState = inject(CurrencyState);
  private readonly alerts = inject(AlertController);
  protected readonly tour = inject(TourService);
  protected readonly update = inject(UpdateService);
  protected readonly news = inject(NewsService);
  protected readonly appearance = signal<Appearance>(savedAppearance());
  protected readonly appearanceOptions: PillOption[] = [
    { value: 'sistema', label: 'Sistema' },
    { value: 'claro', label: 'Claro' },
    { value: 'oscuro', label: 'Oscuro' },
  ];

  /** Se aplica al instante en toda la app y se guarda para la próxima vez. */
  protected changeAppearance(value: string) {
    this.appearance.set(value as Appearance);
    setAppearance(this.container.settings, value as Appearance).catch(console.error);
  }
  protected readonly help = inject(HelpService);
  protected readonly helpTopics = HELP_TOPICS;
  protected helpTitle(t: HelpTopic) {
    return HELP[t].title;
  }
  protected readonly userName = signal('');
  protected readonly showPrivacy = signal(false);
  protected readonly version = APP_VERSION;

  protected readonly currencies: { code: Currency; label: string }[] = [
    { code: 'DOP', label: 'Peso dominicano (RD$)' },
    { code: 'USD', label: 'Dólar estadounidense (US$)' },
  ];

  protected readonly failed = signal(false);
  protected readonly liveMessage = signal('');
  protected readonly currencyOpen = signal(false);
  protected readonly currencyLabel = computed(
    () => this.currencies.find((c) => c.code === this.currencyState.currency())?.label ?? '',
  );

  constructor() {
    addIcons({ checkmark, chevronBack, chevronDown, chevronForward, helpCircleOutline });
    effect(() => {
      this.monthState.version();
      this.load();
    });
  }

  protected async editName() {
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header: 'Tu nombre',
      message: 'Solo para saludarte en Inicio. Déjalo vacío para quitarlo.',
      inputs: [{ name: 'name', type: 'text', value: this.userName(), attributes: { maxlength: 40, autocapitalize: 'words' } }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Guardar', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss();
    if (role !== 'confirm') return;
    try {
      this.userName.set(await this.container.profile.setName(String(data?.values?.name ?? '')));
      this.monthState.notifyChange();
      this.liveMessage.set('Nombre guardado');
    } catch (error) {
      console.error(error);
      this.liveMessage.set('No se pudo guardar el nombre.');
    }
  }

  protected async setCurrency(code: Currency) {
    this.currencyOpen.set(false);
    if (code === this.currencyState.currency()) return;
    try {
      await this.currencyState.change(code);
      this.liveMessage.set(`Moneda cambiada a ${code}`);
    } catch (error) {
      console.error(error);
      this.liveMessage.set('No se pudo cambiar la moneda. Inténtalo de nuevo.');
    }
  }

  private async load() {
    try {
      this.userName.set(await this.container.profile.name());
      this.failed.set(false);
    } catch (error) {
      console.error(error);
      this.failed.set(true);
    }
  }
}
