// Contador giratorio de design.md 10.5. Sin dependencias; las clases .t-reel* viven en global.scss
// porque estos nodos se crean a mano y los estilos encapsulados de un componente no los alcanzan.
const SPINS = 2; // vueltas completas antes de caer en el dígito final
const DIGITS = '0123456789';
const NS = 'http://www.w3.org/2000/svg';
const mk = (tag: string, cls: string) => {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
};

export function renderReel(root: HTMLElement, text: string, prev = ''): void {
  const css = getComputedStyle(document.documentElement);
  const num = (v: string) => parseFloat(css.getPropertyValue(v));
  const cell = num('--reel-cell'),
    dur = num('--reel-dur');
  const stagger = num('--reel-stagger'),
    blur = num('--reel-spin-blur');

  root.replaceChildren();
  if (typeof matchMedia !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.textContent = text; // sin animación: el valor final directo
    return;
  }

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  const defs = document.createElementNS(NS, 'defs');
  svg.append(defs);
  root.append(svg);

  const sameLength = prev.length === text.length;
  let n = 0; // índice entre las columnas de dígitos, para el escalonado

  [...text].forEach((ch, i) => {
    if (!DIGITS.includes(ch)) {
      const s = mk('span', 't-reel-static');
      s.textContent = ch;
      root.append(s);
      return;
    }
    const col = mk('span', 't-reel-col');
    const strip = mk('span', 't-reel-strip');
    for (let k = 0; k < SPINS * 10 + 10; k++) {
      const d = mk('span', 't-reel-digit');
      d.textContent = String(k % 10);
      strip.append(d);
    }
    col.append(strip);
    root.append(col);

    const digit = Number(ch);
    const prevDigit = sameLength && DIGITS.includes(prev[i]) ? Number(prev[i]) : 0;
    if (sameLength && prev[i] === ch) {
      // no cambió: queda quieto
      strip.style.transform = `translateY(${-digit * cell}px)`;
      return;
    }

    const f = document.createElementNS(NS, 'filter');
    f.id = `reel-blur-${i}`;
    f.setAttribute('y', '-20%');
    f.setAttribute('height', '140%');
    const fe = document.createElementNS(NS, 'feGaussianBlur');
    fe.setAttribute('stdDeviation', `0 ${blur}`);
    f.append(fe);
    defs.append(f);
    strip.style.filter = `url(#${f.id})`;

    strip.style.transform = `translateY(${-prevDigit * cell}px)`;
    void strip.offsetHeight; // fija el punto de partida antes de animar
    const delay = n++ * stagger;
    requestAnimationFrame(() => {
      strip.style.transition = `transform ${dur}ms var(--reel-ease) ${delay}ms`;
      strip.style.transform = `translateY(${-(SPINS * 10 + digit) * cell}px)`;
    });

    const t0 = performance.now() + delay; // el desenfoque decae en la ventana de cada columna
    const tick = (now: number) => {
      const t = Math.min(Math.max((now - t0) / dur, 0), 1);
      fe.setAttribute('stdDeviation', `0 ${blur * Math.pow(1 - t, 3)}`);
      if (t < 1) requestAnimationFrame(tick);
      else strip.style.filter = 'none';
    };
    requestAnimationFrame(tick);
  });
}
