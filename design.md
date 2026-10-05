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
| `--paper` | `#FFFFFF` | Solo texto o íconos sobre superficies de color. No se usa como fondo: es demasiado potente |
| `--surface-soft` | `#E2DEEE` | Fondo de las pantallas claras (Movimientos, Ahorro, Ajustes y los formularios) |
| `--surface-soft-card` | `#ECE9F6` | Tarjetas, campos y selectores sobre `--surface-soft` |
| `--surface-soft-chip` | `#F6F4FC` | Círculos de ícono dentro de `--surface-soft-card` |
| `--lavender-100` | `#EFEAFF` | Superficies suaves sobre fondo claro |
| `--text-on-dark` | `#F4F2FF` | Texto sobre oscuro |
| `--text-on-light` | `#14121F` | Texto sobre claro |
| `--muted` | `#8C88A6` | Texto secundario sobre fondos oscuros (5.2:1 sobre `--ink-800`) |
| `--muted-on-light` | `#5F5B7A` | Texto secundario sobre `--surface-soft` (4.9:1); el `--muted` no llega a 4.5:1 en claro |
| `--positive` | `#2BD07F` | Ingresos, balance positivo, meta cumplida (sobre oscuro) |
| `--positive-on-light` | `#0A6F40` | Igual, sobre `--surface-soft` (AA) |
| `--negative` | `#FF5470` | Gastos pasados de presupuesto, balance negativo (sobre oscuro) |
| `--negative-on-light` | `#B01E39` | Igual, sobre `--surface-soft` (AA) |
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
- **Campos de formulario**: radio 16 px, fondo ligeramente más claro que la tarjeta, borde violeta al enfocar.
- **Selector de mes**: píldora con flechas, siempre visible arriba. Cambiar de mes anima el número, no la pantalla.
- **Dona de gastos**: grosor medio, un color distinto por categoría dentro de la familia violeta más 2 acentos,
  total en el centro con la fuente condensada.
- **Barra de progreso de ahorro**: pista `rgba(255,255,255,.12)`, relleno con degradado violeta, el porcentaje al final.
- **Fila de transacción**: ícono en círculo, nombre, nota en `--muted`, monto alineado a la derecha.
  Gasto fijo con chip "Pagado" (verde) o "Pendiente" (ámbar).
- **Barra inferior**: píldora flotante oscura con 4 pestañas solo con texto (Inicio, Movimientos, Fijos, Ahorro);
  cada una mide lo que su texto para caber en 360 px. El botón + redondo agrega lo que toca según la pestaña:
  un movimiento, un gasto fijo o una meta de ahorro.
- **Fijos (pantalla oscura)**: tarjeta con lo pendiente del mes, barra de lo pagado y una tarjeta por gasto con
  vencimiento relativo (ámbar si faltan 3 días o menos), chip Pendiente/Pagado y "Marcar como pagado".
- **Ahorro (pantalla clara)**: tarjeta de marca con lo ahorrado en el mes y su % del ingreso; control
  "Acumulado / Este mes" (10.3): metas con barra de progreso (verde al cumplirse) y botón "Aportar", o los
  aportes del mes.
- **Presupuestos (tarjeta en Inicio)**: lo gastado contra el límite por categoría; barra ámbar desde el 85% y
  roja con ícono al pasarse. Si el mes no tiene y el anterior sí, ofrece copiarlos.
- **Ajustes (pantalla clara, fuera de las pestañas)**: desde el engranaje de Inicio. Moneda (DOP o USD, solo cambia
  el símbolo; menú de 10.4) y categorías por tipo con alta, renombrar y eliminar (solo si nada la usa).

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

Solo hay cuatro transiciones aprobadas. Todas responden a una acción del usuario (tocar una pestaña, guardar algo, abrir un menú),
así que no cuentan como animación decorativa. Cualquier otra transición nueva se consulta antes de agregarla.
Todas respetan `prefers-reduced-motion` (ya incluido en el CSS).

### 10.1 Pestañas con píldora deslizante (barra inferior)

Dónde: la barra inferior (Inicio, Movimientos, Fijos, Ahorro). También el control de dos opciones de 10.3. Implementarla como componente propio
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

Aplicado en: Ahorro, "Acumulado / Este mes" (componente `app-page-slide`). En la app no hay pestaña "Mes".
Para que no colapse, las páginas usan `inset: 0 0 auto` y el contenedor toma la altura de la visible.

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

Aplicado en: selector de mes (cuadrícula de meses con cambio de año e "Ir al mes actual"), menú "⋯" de cada fila
en Movimientos (Duplicar abre un movimiento nuevo con los mismos datos y la fecha de hoy) y moneda en Ajustes.
Componente `app-dropdown`; cerca del final de la pantalla el menú "⋯" se abre hacia arriba (`bottom-right`).

Conexión: al abrir, `abierto = true`. Al cerrar, `abierto = false`, `cerrando = true` y tras 150 ms (`--dropdown-close-dur`)
`cerrando = false`. Cerrar al tocar fuera, al elegir una opción y con el botón atrás de Android.
Cada fila usa `role="menuitem"`, y el botón que abre el menú lleva `aria-expanded` y `aria-haspopup="menu"`.ok