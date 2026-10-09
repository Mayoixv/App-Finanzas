# DESIGN.md — Finanzas Personales (app móvil Ionic + Angular)

Referencia: landing de una app fintech con estética violeta eléctrico, secciones que alternan entre
negro profundo y blanco, titulares gigantes en mayúsculas condensadas y objetos 3D de cristal con brillo.
Este archivo traduce esa estética a una app móvil de finanzas personales. Los valores de color y
tipografía son estimados a ojo desde una captura, así que ajústalos si el resultado se ve apagado.

## 1. Tema visual y atmósfera

- Sensación: moderna, segura, con energía. Mucho contraste entre superficies oscuras y claras.
- Una sola familia cromática: violeta. Todo lo demás es negro, blanco y lavanda.
- El momento memorable de cada pantalla es un solo elemento grande (el balance del mes, la dona de gastos
  o la tarjeta de ahorro) con brillo violeta detrás. El resto se mantiene callado y ordenado.
- Densidad media: aire generoso alrededor de los números importantes, filas compactas en las listas.

## 2. Paleta de color y roles

| Token | Hex (estimado) | Rol |
|---|---|---|
| `--violet-600` | `#6A3DF0` | Acción principal, botones, estados activos |
| `--violet-400` | `#8F6BFF` | Degradados, bordes con brillo, íconos activos |
| `--violet-900` | `#2A1478` | Fondo del degradado profundo (hero, tarjetas destacadas) |
| `--ink-950` | `#0A0A12` | Fondo de pantallas oscuras |
| `--ink-800` | `#171722` | Tarjetas sobre fondo oscuro |
| `--paper` | `#FFFFFF` | Fondo de pantallas claras |
| `--lavender-100` | `#EFEAFF` | Superficies suaves sobre fondo claro |
| `--text-on-dark` | `#F4F2FF` | Texto sobre oscuro |
| `--text-on-light` | `#14121F` | Texto sobre claro |
| `--muted` | `#8C88A6` | Texto secundario |
| `--positive` | `#2BD07F` | Ingresos, balance positivo, meta cumplida |
| `--negative` | `#FF5470` | Gastos pasados de presupuesto, balance negativo |
| `--warning` | `#FFB84D` | Gasto fijo pendiente cerca del vencimiento |

Degradado de marca: `linear-gradient(160deg, #8F6BFF 0%, #6A3DF0 45%, #2A1478 100%)`.
Brillo: `radial-gradient(circle at 50% 0%, rgba(143,107,255,.55), transparent 65%)` detrás del elemento principal.
Verde y rojo solo significan dinero que entra o sale. No los uses como decoración.

## 3. Tipografía

- Titulares: sans condensada pesada en MAYÚSCULAS (probar `Anton`, `Bebas Neue` o `Archivo` con eje de ancho
  condensado, peso 800). Interlineado ajustado (0.95) y tracking ligeramente negativo.
- Cuerpo y datos: `Inter` (pesos 400, 500, 600). Los montos usan `font-variant-numeric: tabular-nums`.
- Empaquetar las fuentes dentro de la app (no depender de Google Fonts), porque funciona sin internet.

| Uso | Tamaño | Peso |
|---|---|---|
| Monto principal (balance) | 44–56 px, fuente condensada | 800 |
| Título de pantalla | 32 px, condensada, mayúsculas | 800 |
| Título de sección | 20 px, Inter | 600 |
| Cuerpo | 15–16 px | 400 |
| Etiqueta / nota | 12–13 px | 500 |

Largo de línea menor a 80 caracteres. Las mayúsculas se reservan para titulares de pantalla, no para etiquetas pequeñas.

## 4. Componentes

- **Botón principal**: píldora completa (radio 999px), fondo `--violet-600`, texto blanco, 52 px de alto,
  sombra de brillo violeta suave. Estado presionado: se oscurece, escala 0.98.
- **Botón secundario**: píldora con borde de 1.5 px en violeta, fondo transparente.
- **Tarjeta**: radio 24 px, fondo `--ink-800` en oscuro o `--lavender-100` en claro, borde de 1 px con
  `rgba(143,107,255,.25)`. Las tarjetas destacadas (balance, meta) usan el degradado de marca.
  Inclinación 3D con reflejo de luz (sección 10.6): solo en la tarjeta de balance de Inicio y en las tarjetas
  de cuenta o tarjeta de crédito de la sección Dinero, cuando exista. Las demás tarjetas son planas.
- **Campos de formulario**: radio 16 px, fondo ligeramente más claro que la tarjeta, borde violeta al enfocar.
- **Selector de mes**: píldora con flechas, siempre visible arriba. Cambiar de mes anima el número, no la pantalla.
- **Dona de gastos**: grosor medio, un color distinto por categoría dentro de la familia violeta más 2 acentos,
  total en el centro con la fuente condensada.
- **Barra de progreso de ahorro**: pista `rgba(255,255,255,.12)`, relleno con degradado violeta, el porcentaje al final.
- **Fila de transacción**: ícono en círculo, nombre, nota en `--muted`, monto alineado a la derecha.
  Gasto fijo con chip "Pagado" (verde) o "Pendiente" (ámbar).
- **Barra inferior**: 4 pestañas (Inicio, Mes, Ahorros, Resumen), píldora flotante oscura con la pestaña
  activa resaltada en violeta.

## 5. Layout

- Una columna, márgenes laterales de 20 px. Escala de espaciado: 4, 8, 12, 16, 24, 32, 48.
- Pantalla de inicio: encabezado con selector de mes, tarjeta de balance grande con degradado, dona de gastos,
  lista de los últimos movimientos.
- Alternar fondo oscuro y claro por pantalla o por bloque grande, como en la referencia, nunca mezclar
  más de dos superficies en la misma vista.
- Alineación: titulares de pantalla a la izquierda en la app; centrados solo en pantallas vacías y bienvenida.

## 6. Profundidad y elevación

- Sin sombras grises genéricas. La profundidad viene del brillo violeta detrás de los elementos clave y del
  contraste entre capas (fondo negro, tarjeta `--ink-800`, tarjeta de marca).
- Efecto cristal solo en la barra inferior y en la tarjeta de balance: `backdrop-filter: blur(20px)` con borde
  claro de 1 px.
- Los objetos 3D de la referencia (teléfono, tarjetas flotando) no se copian. Si hace falta una ilustración,
  usar una tarjeta o moneda en SVG con el mismo degradado.

## 7. Qué hacer y qué no

Hacer:
- Un solo elemento protagonista por pantalla, con brillo detrás.
- Números grandes y legibles, verde para ingresos, rojo solo para alertas reales.
- Textos en español, frases cortas, verbos claros ("Guardar gasto", "Marcar como pagado").
- Estados vacíos que inviten a actuar ("Aún no registras ingresos este mes. Agrega el primero.").

No hacer:
- No copiar el nombre, el logo ni los textos de la referencia.
- No inventar cifras de relleno (usuarios, millones, porcentajes). Solo datos reales del usuario.
- No usar el mismo radio ni la misma sombra en todo; jerarquía: píldora para acciones, 24 px para tarjetas, 16 px para campos.
- No agregar etiquetas pequeñas en mayúsculas sobre cada encabezado.
- No animar cada tarjeta al entrar; una sola animación por pantalla, o ninguna, y respetar `prefers-reduced-motion`. Excepción: las transiciones de la sección 10, que responden a una acción del usuario.

## 8. Comportamiento responsive y accesibilidad

- Diseño base: móvil de 360–430 px de ancho. Zonas táctiles de al menos 48 px.
- En tablet y PC (más adelante): máximo 480 px para el contenido de la app centrado, o dos columnas
  (resumen a la izquierda, movimientos a la derecha) a partir de 900 px.
- Contraste mínimo AA: texto `--muted` solo sobre fondos donde cumpla 4.5:1.
- Foco visible en todos los controles; los estados no dependen solo del color (ícono o texto además del verde/rojo).

## 9. Guía rápida para el agente

- Prompt corto: "Usa DESIGN.md. Construye la pantalla de Inicio: selector de mes, tarjeta de balance con
  degradado violeta, dona de gastos y lista de movimientos, sobre fondo `--ink-950`."
- Orden de trabajo: primero variables CSS globales (colores, radios, espaciado) en `src/theme/variables.scss`,
  luego componentes compartidos, luego pantallas.
- Ionic: sobrescribir `--ion-color-primary` con `--violet-600` y usar `ion-tab-bar` personalizada para la barra inferior.

## 10. Transiciones (Transitions.dev)

Solo hay seis transiciones aprobadas. Todas responden a una acción del usuario (tocar una pestaña, guardar algo, abrir un menú, cambiar de mes),
así que no cuentan como animación decorativa. Cualquier otra transición nueva se consulta antes de agregarla.
Todas respetan `prefers-reduced-motion` (ya incluido en el CSS).

### 10.1 Pestañas con píldora deslizante (barra inferior)

Dónde: la barra inferior de 4 pestañas (Inicio, Mes, Ahorros, Resumen). Implementarla como componente propio
de Angular con `<span class="t-tabs-pill">` y botones `.t-tab`, no con el `ion-tab-bar` por defecto.

Cambios respecto al original, por las zonas táctiles de 48 px y la paleta del proyecto:
alto de 44 px (el original usa 30 px), barra con `--ink-800` y píldora con `--violet-600`.

```css
:root {
  --tabs-dur: 250ms;
  --tabs-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --tabs-text-muted: var(--muted);
  --tabs-text-active: #ffffff;
  --tabs-bar-bg: var(--ink-800);
  --tabs-pill-bg: var(--violet-600);
}
.t-tabs {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px;
  border-radius: 48px;
  background: var(--tabs-bar-bg);
}
.t-tab {
  position: relative;
  appearance: none;
  border: 0;
  background: transparent;
  height: 44px;
  padding: 4px 16px;
  color: var(--tabs-text-muted);
  cursor: pointer;
  border-radius: 48px;
  z-index: 1;
  transition: color var(--tabs-dur) var(--tabs-ease);
}
.t-tab:not([aria-selected="true"]):hover,
.t-tab[aria-selected="true"] { color: var(--tabs-text-active); }
.t-tabs-pill {
  position: absolute;
  top: 4px;
  left: 0;
  height: 44px;
  width: 0;
  background: var(--tabs-pill-bg);
  border-radius: 48px;
  transform: translateX(0);
  transition: transform var(--tabs-dur) var(--tabs-ease), width var(--tabs-dur) var(--tabs-ease);
  will-change: transform, width;
  z-index: 0;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .t-tabs-pill, .t-tab { transition: none !important; }
}
```

```html
<div class="t-tabs" role="tablist">
  <span class="t-tabs-pill" aria-hidden="true"></span>
  <button class="t-tab" role="tab" aria-selected="true">Inicio</button>
  <button class="t-tab" role="tab" aria-selected="false">Mes</button>
  <button class="t-tab" role="tab" aria-selected="false">Ahorros</button>
  <button class="t-tab" role="tab" aria-selected="false">Resumen</button>
</div>
```

Conexión (en el componente Angular):
- Al tocar una pestaña: cambiar `aria-selected` en todas, navegar a su ruta y escribir en la píldora
  `pill.style.transform = translateX(${tab.offsetLeft}px)` y `pill.style.width = ${tab.offsetWidth}px`.
- En el primer render y en cada resize (`ngAfterViewInit` y `window:resize`): escribir los mismos valores SIN transición.
  Poner `transition: none`, forzar reflow (`pill.offsetWidth`), y restaurar la transición.
- La pestaña activa debe sincronizarse también con la ruta actual (por ejemplo al abrir la app o con el botón atrás).

### 10.2 Check de éxito (guardado correcto)

Dónde: confirmación al guardar un gasto o ingreso, marcar un gasto fijo como pagado y registrar un aporte
de ahorro. Se muestra unos 1.2 s sobre la tarjeta o en un modal pequeño, y luego vuelve a `data-state="out"`.
Color del trazo: `--positive`.

```css
:root {
  --check-opacity-dur: 500ms;
  --check-rotate-dur: 500ms;
  --check-rotate-from: 80deg;
  --check-bob-dur: 500ms;
  --check-y-amount: 40px;
  --check-blur-dur: 500ms;
  --check-blur-from: 10px;
  --check-path-dur: 500ms;
  --check-path-delay: 80ms;
  --check-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --check-ease-opacity: cubic-bezier(0.22, 1, 0.36, 1);
  --check-ease-rotate: cubic-bezier(0.22, 1, 0.36, 1);
  --check-ease-bob: cubic-bezier(0.34, 1.35, 0.64, 1);
  --check-ease-path: cubic-bezier(0.22, 1, 0.36, 1);
}
.t-success-check {
  display: inline-block;
  transform-origin: center;
  opacity: 0;
  will-change: transform, opacity, filter;
}
.t-success-check svg { display: block; overflow: visible; }
.t-success-check svg path {
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
}
.t-success-check[data-state="in"] {
  animation:
    t-check-fade   var(--check-opacity-dur) var(--check-ease-opacity) forwards,
    t-check-rotate var(--check-rotate-dur)  var(--check-ease-rotate)  forwards,
    t-check-blur   var(--check-blur-dur)    var(--check-ease-out)     forwards,
    t-check-bob    var(--check-bob-dur)     var(--check-ease-bob)     forwards;
}
.t-success-check[data-state="in"] svg path {
  animation: t-check-draw var(--check-path-dur) var(--check-ease-path) var(--check-path-delay, 0ms) forwards;
}
@keyframes t-check-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes t-check-rotate {
  from { transform: rotate(var(--check-rotate-from)); }
  to   { transform: rotate(0deg); }
}
@keyframes t-check-blur {
  from { filter: blur(var(--check-blur-from)); }
  to   { filter: blur(0); }
}
@keyframes t-check-bob {
  from { translate: 0 var(--check-y-amount); }
  to   { translate: 0 0; }
}
@keyframes t-check-draw { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) {
  .t-success-check { animation: none !important; opacity: 1; }
  .t-success-check svg path { animation: none !important; stroke-dashoffset: 0 !important; }
}
```

```html
<span class="t-success-check" [attr.data-state]="saved ? 'in' : 'out'" aria-hidden="true">
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <path d="M12 25 L21 34 L36 15" stroke="var(--positive)" stroke-width="4"
          stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</span>
```

Notas:
- `stroke-dasharray` vale 40 porque el trazo mide unos 37 px. Si se cambia el ícono, usar `path.getTotalLength()`.
- Como el ícono es decorativo, el éxito también debe anunciarse con texto ("Gasto guardado") en una región `aria-live="polite"`.
- Solo cubre la aparición. Para ocultarlo, volver a `data-state="out"` tras el temporizador (sin animación de salida).
- Para repetirlo, quitar y volver a poner `data-state="in"` en frames distintos para que la animación se reinicie.

### 10.3 Cambio de vista lado a lado (dos páginas)

Dónde: alternar entre dos vistas dentro de la misma pantalla con un control de dos opciones, por ejemplo
"Este mes / Acumulado" en Ahorros o "Fijos / Variables" en Mes. Solo sirve para exactamente dos vistas;
para más, usar navegación normal. La vista 1 sale hacia la izquierda y la vista 2 hacia la derecha.

Importante: las páginas son `position: absolute`, así que el contenedor `.t-page-slide` necesita una altura
definida (por ejemplo `min-height` fijo o `height: 100%` dentro de un `ion-content` con scroll propio por página).
Si no, el contenedor colapsa a 0 px de alto.

```css
:root {
  --page-slide-dur: 250ms;
  --page-fade-dur: 250ms;
  --page-slide-distance: 8px;
  --page-blur: 3px;
  --page-stagger: 0ms;
  --page-exit-enabled: 1;
  --page-slide-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --page-fade-ease: cubic-bezier(0.22, 1, 0.36, 1);
}
.t-page-slide { position: relative; }
.t-page-slide .t-page[data-page-id="1"] { --t-page-from-x: calc(var(--page-slide-distance) * -1); }
.t-page-slide .t-page[data-page-id="2"] { --t-page-from-x: var(--page-slide-distance); }
.t-page-slide .t-page {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transform: translateX(calc(var(--t-page-from-x, 0px) * var(--page-exit-enabled)));
  filter: blur(calc(var(--page-blur) * var(--page-exit-enabled)));
  transition:
    opacity   var(--page-fade-dur)  var(--page-fade-ease),
    transform var(--page-slide-dur) var(--page-slide-ease),
    filter    var(--page-slide-dur) var(--page-slide-ease);
  will-change: opacity, transform, filter;
}
.t-page-slide[data-page="1"] .t-page[data-page-id="1"],
.t-page-slide[data-page="2"] .t-page[data-page-id="2"] {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
  filter: blur(0);
  transition-delay: var(--page-stagger);
}
@media (prefers-reduced-motion: reduce) {
  .t-page-slide .t-page { transition: none !important; }
}
```

```html
<div class="t-page-slide" [attr.data-page]="vista">
  <section class="t-page" data-page-id="1">…</section>
  <section class="t-page" data-page-id="2">…</section>
</div>
```

Conexión: `vista` es `1` o `2` en el componente. El control que lo cambia puede reutilizar la píldora de 10.1.
Poner `--page-exit-enabled: 0` si se quiere solo fundido, sin deslizamiento ni desenfoque.

### 10.4 Menú desplegable

Dónde: selector de mes (se abre desde el botón del mes, origen `top-center`), menú de acciones "⋯" de cada
movimiento (Editar, Duplicar, Eliminar; origen `top-right`) y selector de moneda. El menú es una tarjeta
de `--ink-800`, radio 16 px, borde de 1 px con `rgba(143,107,255,.25)` y filas de al menos 48 px.
Colocarlo con `position: absolute` junto al botón que lo abre y con `z-index` por encima del contenido.

```css
:root {
  --dropdown-open-dur: 250ms;
  --dropdown-close-dur: 150ms;
  --dropdown-pre-scale: 0.97;
  --dropdown-closing-scale: 0.99;
  --dropdown-ease: cubic-bezier(0.22, 1, 0.36, 1);
}
.t-dropdown {
  transform-origin: top left;
  transform: scale(var(--dropdown-pre-scale));
  opacity: 0;
  pointer-events: none;
  transition:
    transform var(--dropdown-open-dur) var(--dropdown-ease),
    opacity   var(--dropdown-open-dur) var(--dropdown-ease);
  will-change: transform, opacity;
}
.t-dropdown[data-origin="top-right"]     { transform-origin: top right; }
.t-dropdown[data-origin="top-center"]    { transform-origin: top center; }
.t-dropdown[data-origin="bottom-left"]   { transform-origin: bottom left; }
.t-dropdown[data-origin="bottom-center"] { transform-origin: bottom center; }
.t-dropdown[data-origin="bottom-right"]  { transform-origin: bottom right; }
.t-dropdown.is-open {
  transform: scale(1);
  opacity: 1;
  pointer-events: auto;
}
.t-dropdown.is-closing {
  transform: scale(var(--dropdown-closing-scale));
  opacity: 0;
  pointer-events: none;
  transition:
    transform var(--dropdown-close-dur) var(--dropdown-ease),
    opacity   var(--dropdown-close-dur) var(--dropdown-ease);
}
@media (prefers-reduced-motion: reduce) {
  .t-dropdown { transition: none !important; }
}
```

```html
<div class="t-dropdown" data-origin="top-right" [class.is-open]="abierto" [class.is-closing]="cerrando" role="menu">
  <!-- filas del menú -->
</div>
```

Conexión: al abrir, `abierto = true`. Al cerrar, `abierto = false`, `cerrando = true` y tras 150 ms (`--dropdown-close-dur`)
`cerrando = false`. Cerrar al tocar fuera, al elegir una opción y con el botón atrás de Android.
Cada fila usa `role="menuitem"`, y el botón que abre el menú lleva `aria-expanded` y `aria-haspopup="menu"`.

### 10.5 Contador giratorio (solo el balance final del mes)

Dónde: SOLO el monto grande de "Balance final" en la tarjeta de balance de Inicio (la cifra más grande de la app).
Los demás números (ingresos, gastos, totales del resumen, montos de las filas) se muestran estáticos.
Cuándo corre: al abrir Inicio, al cambiar de mes y cuando guardar o borrar un movimiento cambia el balance.
Si el valor no cambió, no se anima. Es la animación protagonista de esa pantalla, así que no agregar otras
animaciones de entrada ahí.

Dimensiones: el desvanecido de los bordes oculta el 22 % superior e inferior de la celda, por eso la celda debe ser
más alta que el texto. Con el monto principal en 48 px de la fuente condensada (sección 3), la celda es de 72 px.
Si se cambia el tamaño del monto, mantener la celda en 1.5 veces el `font-size`.

```css
:root {
  --reel-dur: 1400ms;
  --reel-cell: 72px;
  --reel-spin-blur: 3px;
  --reel-stagger: 90ms;
  --reel-ease: cubic-bezier(0.16, 1, 0.3, 1);
}
.t-reel {
  display: inline-flex;
  align-items: center;
  height: var(--reel-cell);
  font-family: var(--font-display); /* la condensada de titulares; definirla junto a las demás variables */
  font-weight: 800;
  font-size: 48px;
  line-height: 1;
  color: var(--text-on-dark);
  font-variant-numeric: tabular-nums;
}
.t-reel-col {
  position: relative;
  height: var(--reel-cell);
  overflow: hidden;
  /* Desvanece los bordes de la ventana en vez de recortarlos en seco. */
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%);
}
.t-reel-strip { display: flex; flex-direction: column; will-change: transform, filter; }
.t-reel-digit { height: var(--reel-cell); display: flex; align-items: center; justify-content: center; }
/* Caracteres que no giran: símbolo de moneda, comas, punto decimal y signo menos. */
.t-reel-static { height: var(--reel-cell); display: flex; align-items: center; }
.sr-only {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
@media (prefers-reduced-motion: reduce) {
  .t-reel-strip { transition: none !important; filter: none !important; }
}
```

```html
<div class="balance-amount">
  <div class="t-reel" #reel aria-hidden="true"></div>
  <span class="sr-only" aria-live="polite">{{ balanceTexto }}</span>
</div>
```

Cómo funciona: se formatea el balance con `Intl.NumberFormat("es-DO", { style: "currency", currency })` y se construye
una columna por cada dígito. Cada columna recorta una tira con las cifras 0 a 9 repetidas y se desplaza hacia arriba
`(vueltas * 10 + dígito)` celdas. El desenfoque de movimiento es un `feGaussianBlur` de SVG con `stdDeviation="0 Y"`
(solo vertical, porque el `blur()` de CSS también ensucia hacia los lados), y baja a 0 en cada columna mientras se detiene.

```ts
// reel.ts — sin dependencias. Llamar desde ngAfterViewInit y cada vez que cambie el balance.
const SPINS = 2;          // vueltas completas antes de caer en el dígito final
const DIGITS = "0123456789";
const NS = "http://www.w3.org/2000/svg";
const mk = (tag: string, cls: string) => {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
};

export function renderReel(root: HTMLElement, text: string, prev: string = ""): void {
  const css = getComputedStyle(document.documentElement);
  const num = (v: string) => parseFloat(css.getPropertyValue(v));
  const cell = num("--reel-cell"), dur = num("--reel-dur");
  const stagger = num("--reel-stagger"), blur = num("--reel-spin-blur");

  root.replaceChildren();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.textContent = text;       // sin animación: el valor final directo
    return;
  }

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  const defs = document.createElementNS(NS, "defs");
  svg.append(defs);
  root.append(svg);

  const sameLength = prev.length === text.length;
  let n = 0; // índice entre las columnas de dígitos, para el escalonado

  [...text].forEach((ch, i) => {
    if (!DIGITS.includes(ch)) {
      const s = mk("span", "t-reel-static");
      s.textContent = ch;
      root.append(s);
      return;
    }
    const col = mk("span", "t-reel-col");
    const strip = mk("span", "t-reel-strip");
    for (let k = 0; k < SPINS * 10 + 10; k++) {
      const d = mk("span", "t-reel-digit");
      d.textContent = String(k % 10);
      strip.append(d);
    }
    col.append(strip);
    root.append(col);

    const digit = Number(ch);
    const prevDigit = sameLength && DIGITS.includes(prev[i]) ? Number(prev[i]) : 0;
    if (sameLength && prev[i] === ch) {            // no cambió: queda quieto
      strip.style.transform = `translateY(${-digit * cell}px)`;
      return;
    }

    const f = document.createElementNS(NS, "filter");
    f.id = `reel-blur-${i}`;
    f.setAttribute("y", "-20%");
    f.setAttribute("height", "140%");
    const fe = document.createElementNS(NS, "feGaussianBlur");
    fe.setAttribute("stdDeviation", `0 ${blur}`);
    f.append(fe);
    defs.append(f);
    strip.style.filter = `url(#${f.id})`;

    strip.style.transform = `translateY(${-prevDigit * cell}px)`;
    void strip.offsetHeight;                       // fija el punto de partida antes de animar
    const delay = n++ * stagger;
    requestAnimationFrame(() => {
      strip.style.transition = `transform ${dur}ms var(--reel-ease) ${delay}ms`;
      strip.style.transform = `translateY(${-(SPINS * 10 + digit) * cell}px)`;
    });

    const t0 = performance.now() + delay;          // el desenfoque decae en la ventana de cada columna
    const tick = (now: number) => {
      const t = Math.min(Math.max((now - t0) / dur, 0), 1);
      fe.setAttribute("stdDeviation", `0 ${blur * Math.pow(1 - t, 3)}`);
      if (t < 1) requestAnimationFrame(tick);
      else strip.style.filter = "none";
    };
    requestAnimationFrame(tick);
  });
}
```

Notas:
- Si la cantidad de caracteres cambia (por ejemplo de 999.00 a 1,000.00), todas las columnas giran desde 0.
- Guardar el último texto mostrado para pasarlo como `prev` en el siguiente llamado.
- El signo menos y el símbolo de moneda son estáticos. Con balance negativo, mostrar además un chip
  ("Negativo, gastas más de lo que ganas") en `--negative`; no colorear el número, porque el rojo pierde contraste sobre el degradado violeta.
- El texto real del balance va siempre en el `<span class="sr-only">`, porque el lector de pantalla no debe leer las columnas.

### 10.6 Inclinación 3D de tarjetas (tilt)

Dónde: solo en la tarjeta de balance de Inicio y en las tarjetas de cuenta o tarjeta de crédito de la sección Dinero.
Las demás tarjetas (listas, formularios, ajustes) quedan planas: el efecto es para las tarjetas protagonistas,
no para todas, así se respeta la regla de la sección 7.
Cómo se siente: la tarjeta se inclina hacia el dedo o el cursor (máximo 8°), un reflejo de luz la sigue y, al soltar,
vuelve a quedar plana en 1 segundo.

Cambios respecto al original de Transitions.dev:
- `border-radius: 24px` (el original usa 12 px), para igualar las tarjetas de la app.
- `touch-action: pan-y` en lugar de `none`. Con `none`, tocar la tarjeta bloquearía el desplazamiento vertical de toda la
  pantalla. Con `pan-y` la pantalla sigue desplazándose y, si el navegador empieza a hacer scroll, la inclinación se
  reinicia sola (evento `pointercancel`). En el teléfono la inclinación aparece al mantener el dedo y arrastrar de lado.
- El brillo violeta detrás de la tarjeta (sección 2) va en el contenedor exterior, no dentro de la tarjeta, porque
  `overflow: hidden` lo recortaría.
- El reflejo (`.t-tilt-glare`) usa `mix-blend-mode: screen`, que solo se nota sobre fondos oscuros o sobre el degradado
  de marca. No incluirlo en tarjetas claras (`--lavender-100`).

```css
:root {
  --tilt-perspective: 1000px;
  --tilt-return: 1000ms;
  --tilt-return-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --tilt-follow: 400ms;
  --tilt-follow-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --tilt-glare-opacity: 0.32;
  --tilt-glare-fade: 300ms;
  --tilt-glare-ease: cubic-bezier(0.22, 1, 0.36, 1);
}

/* Contenedor exterior: nunca se transforma; es el área que detecta el puntero. */
.t-tilt { touch-action: pan-y; }

/* La tarjeta se inclina con rotateX/rotateY que llegan desde JS; al soltar vuelve a plana.
   .is-tilting cambia a un seguimiento corto mientras el puntero se mueve. */
.t-tilt-card {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  transform:
    perspective(var(--tilt-perspective))
    rotateX(var(--tilt-rx, 0deg))
    rotateY(var(--tilt-ry, 0deg));
  transform-style: preserve-3d;
  transition: transform var(--tilt-return) var(--tilt-return-ease);
  will-change: transform;
}
.t-tilt-card.is-tilting {
  transition: transform var(--tilt-follow) var(--tilt-follow-ease);
}

/* Reflejo que sigue al puntero: círculos suaves superpuestos que suman luz (mezcla screen). */
.t-tilt-glare {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  mix-blend-mode: screen;
  background:
    radial-gradient(circle 95px at var(--tilt-gx, 50%) var(--tilt-gy, 50%),
      rgba(255,255,255,0.48), rgba(255,255,255,0.06) 52%, rgba(255,255,255,0) 84%),
    radial-gradient(circle 200px at var(--tilt-gx, 50%) var(--tilt-gy, 50%),
      rgba(255,255,255,0.22), rgba(255,255,255,0.04) 58%, rgba(255,255,255,0) 78%),
    radial-gradient(circle 360px at var(--tilt-gx, 50%) var(--tilt-gy, 50%),
      rgba(255,255,255,0.10), rgba(255,255,255,0) 88%);
  transition: opacity var(--tilt-glare-fade) var(--tilt-glare-ease);
}
.t-tilt.is-hover .t-tilt-glare { opacity: var(--tilt-glare-opacity); }

@media (prefers-reduced-motion: reduce) {
  .t-tilt-card { transform: none !important; transition: none !important; }
}
```

```html
<div class="t-tilt balance-wrap" appTilt>   <!-- el brillo violeta va aquí, fuera de la tarjeta -->
  <div class="t-tilt-card balance-card">
    <!-- contenido de la tarjeta (en Inicio, el contador giratorio de 10.5) -->
    <div class="t-tilt-glare"></div>
  </div>
</div>
```

El original solo describe el JavaScript, así que esta es la directiva de Angular que lo escribe. Se aplica con `appTilt`
al contenedor exterior y registra los eventos de puntero (funcionan igual con mouse, dedo y lápiz):

```ts
// tilt.directive.ts
import { Directive, ElementRef, HostListener, inject } from "@angular/core";

const MAX_DEG = 8; // inclinación máxima en grados

@Directive({ selector: "[appTilt]", standalone: true })
export class TiltDirective {
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  private card(): HTMLElement | null {
    return this.host.querySelector(".t-tilt-card");
  }

  @HostListener("pointerenter")
  onEnter() {
    if (this.reduce) return;
    this.host.classList.add("is-hover");
  }

  @HostListener("pointermove", ["$event"])
  onMove(e: PointerEvent) {
    if (this.reduce) return;
    const r = this.host.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);   // 0 a 1
    const y = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);   // 0 a 1
    this.host.classList.add("is-hover");
    this.card()?.classList.add("is-tilting");
    this.host.style.setProperty("--tilt-ry", `${(x - 0.5) * 2 * MAX_DEG}deg`);
    this.host.style.setProperty("--tilt-rx", `${-(y - 0.5) * 2 * MAX_DEG}deg`);
    this.host.style.setProperty("--tilt-gx", `${x * 100}%`);
    this.host.style.setProperty("--tilt-gy", `${y * 100}%`);
  }

  @HostListener("pointerleave")
  @HostListener("pointercancel")
  @HostListener("pointerup")
  reset() {
    this.host.classList.remove("is-hover");
    this.card()?.classList.remove("is-tilting");
    ["--tilt-rx", "--tilt-ry", "--tilt-gx", "--tilt-gy"].forEach((p) =>
      this.host.style.removeProperty(p),
    );
  }
}
```

Notas:
- Quitar las propiedades al salir hace que la tarjeta vuelva a plana con la transición lenta (`--tilt-return`).
- Probar la tarjeta de balance con el contador giratorio (10.5) dentro, en un teléfono Android real. Una tarjeta con
  transformación 3D puede cambiar cómo se ven el desenfoque SVG y la máscara del contador.
- `will-change: transform` consume memoria: usar `.t-tilt-card` en 1 o 2 tarjetas por pantalla.
- La inclinación es decorativa: nada depende de ella. Las tarjetas que se pueden tocar mantienen foco visible y se
  activan con teclado.
- En PC (versión futura) con mouse funciona por hover sin cambiar nada.