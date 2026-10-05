import { Component, input } from '@angular/core';

/** Check de éxito (design.md, sección 10.2). Decorativo: el mensaje va aparte en una región aria-live. */
@Component({
  selector: 'app-success-check',
  template: `
    <span class="t-success-check" [attr.data-state]="state()" aria-hidden="true">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path
          d="M12 25 L21 34 L36 15"
          stroke="var(--positive)"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  `,
  styleUrls: ['success-check.component.scss'],
})
export class SuccessCheckComponent {
  readonly state = input<'in' | 'out'>('out');
}
