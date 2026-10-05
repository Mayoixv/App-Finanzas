import { AnimationBuilder, createAnimation } from '@ionic/angular';

/** Misma curva de salida que el resto de transiciones (design.md, sección 10). */
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASE_IN = 'cubic-bezier(0.4, 0, 1, 1)';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const rootOf = (el: HTMLElement) => el.shadowRoot ?? el;

/** Los formularios suben desde abajo y frenan suave; el fondo se oscurece a la vez. */
export const sheetEnter: AnimationBuilder = (baseEl: HTMLElement) => {
  const root = rootOf(baseEl);
  const backdrop = createAnimation()
    .addElement(root.querySelector('ion-backdrop')!)
    .fromTo('opacity', '0.01', 'var(--backdrop-opacity)')
    .beforeStyles({ 'pointer-events': 'none' })
    .afterClearStyles(['pointer-events']);
  const sheet = createAnimation()
    .addElement(root.querySelector('.modal-wrapper')!)
    .fromTo('transform', 'translateY(100%)', 'translateY(0)')
    // En modo Android Ionic deja la hoja casi transparente hasta que su animación la muestra.
    .fromTo('opacity', 1, 1);
  return createAnimation()
    .addElement(baseEl)
    .easing(EASE_OUT)
    .duration(reduced() ? 0 : 440)
    .addAnimation([backdrop, sheet]);
};

export const sheetLeave: AnimationBuilder = (baseEl: HTMLElement) => {
  const root = rootOf(baseEl);
  const backdrop = createAnimation()
    .addElement(root.querySelector('ion-backdrop')!)
    .fromTo('opacity', 'var(--backdrop-opacity)', '0');
  const sheet = createAnimation()
    .addElement(root.querySelector('.modal-wrapper')!)
    .fromTo('transform', 'translateY(0)', 'translateY(100%)')
    .fromTo('opacity', 1, 1);
  return createAnimation()
    .addElement(baseEl)
    .easing(EASE_IN)
    .duration(reduced() ? 0 : 260)
    .addAnimation([backdrop, sheet]);
};

/**
 * Cambio de pantalla (Ajustes, Deudas, Bienvenida): la nueva entra deslizándose desde la derecha
 * y la anterior se corre un poco y se apaga. Al volver, al revés.
 */
export const pageTransition: AnimationBuilder = (_baseEl: HTMLElement, opts: Record<string, unknown>) => {
  const entering = opts['enteringEl'] as HTMLElement;
  const leaving = opts['leavingEl'] as HTMLElement | undefined;
  const back = opts['direction'] === 'back';
  const root = createAnimation().duration(reduced() ? 0 : 380).easing(EASE_OUT);
  root.addAnimation(
    createAnimation()
      .addElement(entering)
      .beforeRemoveClass('ion-page-invisible')
      .fromTo('transform', back ? 'translateX(-25%)' : 'translateX(100%)', 'translateX(0)')
      .fromTo('opacity', back ? 0.5 : 1, 1),
  );
  if (leaving) {
    root.addAnimation(
      createAnimation()
        .addElement(leaving)
        .fromTo('transform', 'translateX(0)', back ? 'translateX(100%)' : 'translateX(-25%)')
        .fromTo('opacity', 1, back ? 1 : 0.5),
    );
  }
  return root;
};
