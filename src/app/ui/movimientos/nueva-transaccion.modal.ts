import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import {
  IonContent,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  AlertController,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, cameraOutline, close } from 'ionicons/icons';
import { Account, CASH_ACCOUNT_ID } from '../../domain/account';
import { accountChoices, accountLabel, rememberAccount } from '../cuentas/account-choices';
import { APP_CONTAINER } from '../../app.container';
import { ValidationError } from '../../application/errors';
import { Category, isExpenseType } from '../../domain/category';
import { monthOf } from '../../domain/month';
import { normalizeTags, Transaction } from '../../domain/transaction';
import { amountToInput, defaultDateFor, formatDay, formatMoney, parseAmount } from '../format';
import { CurrencyState } from '../currency-state';
import { photoToDataUrl, pickImage } from '../image';
import { MonthState } from '../month-state';
import { SuccessCheckComponent } from '../success-check.component';
import { UndoService } from '../undo.service';

type Kind = 'gasto' | 'ingreso';

/** Cuánto se ve el check de éxito antes de cerrar (design.md, 10.2). */
const SUCCESS_VISIBLE_MS = 1200;
const MAX_PHOTOS = 3;
const lastCategoryKey = (kind: Kind) => `last_category_${kind}`;

interface Part {
  categoryId: string | null;
  amount: string;
}

interface Photo {
  id: string;
  data: string;
  isNew: boolean;
}

@Component({
  selector: 'app-nueva-transaccion',
  templateUrl: 'nueva-transaccion.modal.html',
  styleUrls: ['nueva-transaccion.modal.scss'],
  imports: [IonContent, IonIcon, IonInput, IonSelect, IonSelectOption, SuccessCheckComponent],
})
export class NuevaTransaccionModalComponent implements OnInit {
  private readonly container = inject(APP_CONTAINER);
  private readonly modalCtrl = inject(ModalController);
  private readonly alerts = inject(AlertController);
  private readonly undo = inject(UndoService);

  /** Si llega, el formulario edita este movimiento en vez de crear uno. */
  @Input() transaction?: Transaction;
  /** Si llega, el formulario crea un movimiento nuevo con estos datos (Duplicar); la fecha queda en hoy. */
  @Input() copyOf?: Transaction;

  private readonly categories = signal<Category[]>([]);
  protected readonly kind = signal<Kind>('gasto');
  protected readonly categoryId = signal<string | null>(null);
  protected readonly accounts = signal<Account[]>([]);
  protected readonly accountId = signal(CASH_ACCOUNT_ID);
  protected readonly accountLabel = accountLabel;
  protected readonly amount = signal('');
  protected readonly date = signal(defaultDateFor(inject(MonthState).month()));
  protected readonly note = signal('');
  protected readonly tags = signal('');
  protected readonly splitOn = signal(false);
  protected readonly parts = signal<Part[]>([]);
  protected readonly photos = signal<Photo[]>([]);
  protected readonly viewing = signal<string | null>(null);
  private readonly removedPhotos: string[] = [];
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saved = signal(false);
  protected readonly currency = inject(CurrencyState).currency;
  protected readonly isEdit = signal(false);
  protected readonly isCopy = signal(false);
  protected readonly maxPhotos = MAX_PHOTOS;

  protected readonly options = computed(() =>
    this.categories().filter((c) =>
      this.kind() === 'ingreso' ? c.type === 'ingreso' : isExpenseType(c.type),
    ),
  );

  /** Centavos sin asignar a ninguna parte (negativo si las partes se pasan del total). */
  protected readonly remaining = computed(() => {
    const total = parseAmount(this.amount()) ?? 0;
    return total - this.parts().reduce((sum, p) => sum + (parseAmount(p.amount) ?? 0), 0);
  });

  private readonly splitValid = computed(
    () =>
      this.parts().length >= 2 &&
      this.remaining() === 0 &&
      this.parts().every((p) => p.categoryId && parseAmount(p.amount) !== null),
  );

  protected readonly saveLabel = computed(() => {
    if (this.isEdit()) return 'Guardar cambios';
    return this.kind() === 'ingreso' ? 'Guardar ingreso' : 'Guardar gasto';
  });

  protected readonly doneMessage = computed(() => {
    if (this.isEdit()) return 'Cambios guardados';
    return this.kind() === 'ingreso' ? 'Ingreso guardado' : 'Gasto guardado';
  });

  protected readonly canSave = computed(
    () =>
      parseAmount(this.amount()) !== null &&
      (this.splitOn() ? this.splitValid() : this.categoryId() !== null) &&
      !this.saving(),
  );

  protected readonly money = formatMoney;
  protected readonly abs = Math.abs;

  constructor() {
    addIcons({ addOutline, cameraOutline, close });
  }

  async ngOnInit() {
    const categories = await this.container.categories.list();
    this.categories.set(categories);

    const t = this.transaction ?? this.copyOf;
    const choices = await accountChoices(this.container, t?.accountId);
    this.accounts.set(choices.accounts);
    this.accountId.set(choices.selected);
    if (!t) {
      await this.applyLastCategory();
      return;
    }
    const category = categories.find((c) => c.id === t.categoryId);
    this.isEdit.set(!!this.transaction);
    this.isCopy.set(!this.transaction);
    this.kind.set(category?.type === 'ingreso' ? 'ingreso' : 'gasto');
    this.categoryId.set(t.categoryId);
    this.amount.set(amountToInput(t.amount));
    if (this.transaction) this.date.set(t.date);
    this.note.set(t.note);
    this.tags.set((t.tags ?? []).join(', '));
    if (t.splits?.length) {
      this.splitOn.set(true);
      this.parts.set(t.splits.map((s) => ({ categoryId: s.categoryId, amount: amountToInput(s.amount) })));
    }
    // Las fotos no se copian al duplicar: un recibo es de un solo gasto.
    if (this.transaction) {
      const attachments = await this.container.transactions.listAttachments(t.id);
      this.photos.set(attachments.map((a) => ({ id: a.id, data: a.data, isNew: false })));
    }
  }

  protected async setKind(value: Kind) {
    this.kind.set(value);
    this.categoryId.set(null);
    this.splitOn.set(false);
    this.parts.set([]);
    if (!this.isEdit()) await this.applyLastCategory();
  }

  protected toggleSplit() {
    if (this.splitOn()) {
      this.splitOn.set(false);
      this.parts.set([]);
      return;
    }
    this.splitOn.set(true);
    this.parts.set([
      { categoryId: this.categoryId(), amount: this.amount() },
      { categoryId: null, amount: '' },
    ]);
  }

  protected updatePart(index: number, change: Partial<Part>) {
    this.parts.update((list) => list.map((p, i) => (i === index ? { ...p, ...change } : p)));
  }

  protected addPart() {
    this.parts.update((list) => [...list, { categoryId: null, amount: '' }]);
  }

  protected removePart(index: number) {
    this.parts.update((list) => list.filter((_, i) => i !== index));
  }

  protected async addPhoto() {
    const file = await pickImage();
    if (!file) return;
    try {
      const data = await photoToDataUrl(file);
      this.photos.update((list) => [...list, { id: crypto.randomUUID(), data, isNew: true }]);
    } catch (e) {
      console.error(e);
      this.error.set('No se pudo leer la foto. Prueba con otra imagen.');
    }
  }

  protected removePhoto(photo: Photo) {
    if (!photo.isNew) this.removedPhotos.push(photo.id);
    this.photos.update((list) => list.filter((p) => p.id !== photo.id));
  }

  protected cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  protected async save() {
    const categoryId = this.splitOn() ? this.parts()[0]?.categoryId : this.categoryId();
    if (!categoryId) return;
    const input = {
      date: this.date(),
      amount: parseAmount(this.amount()) ?? 0,
      categoryId,
      note: this.note(),
      tags: normalizeTags(this.tags()),
      accountId: this.accountId(),
      splits: this.splitOn()
        ? this.parts().map((p) => ({ categoryId: p.categoryId!, amount: parseAmount(p.amount) ?? 0 }))
        : [],
    };
    if (!this.transaction && !(await this.confirmIfDuplicate(input.date, input.amount, categoryId))) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      const saved = this.transaction
        ? await this.container.updateTransaction.execute(this.transaction.id, input)
        : await this.container.addTransaction.execute(input);
      for (const id of this.removedPhotos) await this.container.transactions.deleteAttachment(id);
      for (const p of this.photos().filter((x) => x.isNew)) {
        await this.container.transactions.saveAttachment({ id: p.id, transactionId: saved.id, data: p.data });
      }
      if (!this.splitOn()) await this.container.settings.set(lastCategoryKey(this.kind()), categoryId);
      await rememberAccount(this.container, this.accountId());
      this.saved.set(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_VISIBLE_MS));
      await this.modalCtrl.dismiss(null, 'saved');
    } catch (e) {
      this.error.set(
        e instanceof ValidationError ? e.message : 'No se pudo guardar. Inténtalo de nuevo.',
      );
      this.saving.set(false);
    }
  }

  protected async confirmDelete() {
    const t = this.transaction;
    if (!t) return;
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header: 'Eliminar movimiento',
      message: 'Se borrará este movimiento. Si era el pago de un gasto fijo, ese gasto volverá a quedar pendiente.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') return;

    this.saving.set(true);
    this.error.set(null);
    try {
      const deleted = await this.container.deleteTransaction.execute(t.id);
      await this.modalCtrl.dismiss(null, 'deleted');
      this.undo.offer('Movimiento eliminado', () => this.container.restoreTransaction.execute(deleted));
    } catch (e) {
      console.error(e);
      this.error.set('No se pudo eliminar. Inténtalo de nuevo.');
      this.saving.set(false);
    }
  }

  /** Propone la categoría usada la última vez para este tipo, si todavía existe. */
  private async applyLastCategory() {
    const last = await this.container.settings.get(lastCategoryKey(this.kind()));
    if (last && this.options().some((c) => c.id === last)) this.categoryId.set(last);
  }

  /** Avisa (no bloquea) si ya hay un movimiento con la misma fecha, monto y categoría. */
  private async confirmIfDuplicate(date: string, amount: number, categoryId: string): Promise<boolean> {
    const same = (await this.container.transactions.listByMonth(monthOf(date))).find(
      (t) => t.date === date && t.amount === amount && t.categoryId === categoryId,
    );
    if (!same) return true;
    const name = this.categories().find((c) => c.id === categoryId)?.name ?? '';
    const alert = await this.alerts.create({
      cssClass: 'app-alert',
      header: '¿Está repetido?',
      message: `Ya registraste ${formatMoney(amount)} en ${name} el ${formatDay(date)}${same.note ? ` («${same.note}»)` : ''}. ¿Guardarlo de todas formas?`,
      buttons: [
        { text: 'No guardar', role: 'cancel' },
        { text: 'Guardar igual', role: 'confirm' },
      ],
    });
    await alert.present();
    return (await alert.onDidDismiss()).role === 'confirm';
  }
}
