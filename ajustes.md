# ajuste.md — Cambios a la beta (feedback de pruebas)

Lee primero `CLAUDE.md` y `DESIGN.md`. Todo cambio de UI sigue `DESIGN.md`; si una skill y `DESIGN.md` se contradicen, manda `DESIGN.md`.
La app ya está en manos de personas que la prueban, así que **ningún cambio puede borrar ni corromper datos existentes**.

## Cómo trabajar

1. Antes de tocar código, revisa el proyecto y dime en pocas líneas qué archivos y pantallas afecta cada punto.
2. Haz un punto a la vez, en el orden de la sección "Orden de trabajo". Un commit por punto.
3. Todo cambio de esquema SQLite va como migración que conserve los datos actuales.
4. Prueba con `ionic serve` y, si el cambio toca algo nativo (selectores, teclado, zonas seguras), en un teléfono o emulador Android.
5. Textos de la interfaz en español, frases cortas, sin relleno.
6. Si algo de este archivo es ambiguo o choca con el código existente, pregúntame antes de decidir.

## Orden de trabajo

1. Bug: pago fijo eliminado que sigue apareciendo (punto 5)
2. Texto ilegible y puntos de paginación encima (punto 1)
3. Sueldo con frecuencia y varios días de cobro (punto 2)
4. Selector de categorías propio y categorías personalizadas (punto 3)
5. Gastos e ingresos fijos que agrega el propio usuario (punto 4)
6. Tutorial interactivo sobre las pantallas reales (punto 6)
7. Revisión de intuición del diseño (punto 7)

---

## 1. Texto del tutorial mal escrito y difícil de leer (captura: tutorial 3/7, "Pestaña Fijos")

Problemas reportados:
- La redacción es confusa. Ejemplo literal: "Pausa uno unos meses y mira las cuotas de tus préstamos".
- Los puntos de paginación se dibujan encima del último párrafo y tapan el texto.

Qué hacer:
- Reescribir el texto de todas las diapositivas restantes del tutorial: máximo 3 viñetas, cada una de 2 líneas o menos, verbo al inicio, sin frases ambiguas.
- Evitar que cualquier contenido choque con el pie: dejar el pie (puntos de paginación + botones Atrás/Siguiente) en una zona fija, y que el contenido tenga su propio espacio o scroll por encima.
- Probar en pantallas pequeñas (360 px de ancho) y con el tamaño de fuente del sistema aumentado.

Propuesta de texto para esa diapositiva (ajústala si cambia el flujo del punto 4):
- Agrega una sola vez tus pagos fijos y se repiten cada mes.
- Márcalos como pagados o recibidos cuando ocurran.
- Pausa un pago unos meses y revisa cuántas cuotas te quedan de tus préstamos.

Criterio de listo: ningún elemento se superpone en ninguna diapositiva y el texto se entiende sin explicación extra.

## 2. Sueldo: soportar quincenal y otras frecuencias (captura: "Tu sueldo", paso 4 de 5)

Problema: el campo "Día del mes en que cobras" solo admite un día. Eso sirve para quien trabaja para el Estado (un pago al mes), pero la mayoría del sector privado cobra **dos veces al mes**, y el campo no acepta ni "," ni ";" ni ninguna forma de poner dos días.

Qué hacer:
- Agregar un selector de frecuencia: **Una vez al mes**, **Dos veces al mes (quincenal)** y **Otra** (días personalizados).
- Para dos veces al mes: dos días, con 15 y 30 como sugerencia. Cada cobro puede tener su propio monto, porque no siempre son iguales.
- Permitir "último día del mes" como opción, para que febrero y los meses de 30 días funcionen sin errores.
- Reemplazar el campo de texto libre por controles que no dependan de escribir separadores (selector de día o chips de día), validando 1 a 31.
- Que el campo y el texto del paso sirvan a cualquier persona que cobre (no solo a empleados públicos); revisar el texto "Si cobras un monto fijo...".
- Cada fecha de cobro genera su ingreso del mes en Fijos para marcar como recibido.
- Migración: quienes ya guardaron un solo día de cobro se convierten a "Una vez al mes" con ese día y ese monto.

Criterio de listo: puedo configurar 15 y 30 con montos distintos, ambos aparecen cada mes en Fijos, y el usuario que ya tenía un solo día no pierde nada.

## 3. Selector de categoría inconsistente y categorías propias (captura: "Gastos fijos", paso 5 de 5)

Problemas reportados:
- El selector de categoría abre el diálogo nativo de Android (fondo blanco, círculos de radio, botones CANCELAR y OK en mayúsculas), que no coincide con el resto de la app.
- Solo existen 4 categorías (Alquiler, Pago de deudas, Servicios, Suscripciones) y no se pueden agregar más.

Qué hacer:
- Reemplazar el selector por un componente propio con el estilo de `DESIGN.md` (hoja inferior o menú desplegable de la sección 10.4), con filas de al menos 48 px y selección con un solo toque, sin botón OK.
- Permitir que el usuario cree sus propias categorías desde ese mismo selector con una opción "＋ Nueva categoría" (nombre, y opcionalmente ícono y color).
- Agregar en ajustes una pantalla para administrar categorías: renombrar, cambiar ícono/color y eliminar.
- Si se elimina una categoría que tiene movimientos, pedir que elija a cuál reasignarlos; nunca dejar movimientos sin categoría.
- Las categorías por defecto se pueden editar y ocultar, pero no se borran de forma que rompa datos antiguos.
- Usar el mismo selector en todos los lugares donde se elige categoría (pagos fijos, gastos variables, ingresos si aplica).
- Persistir en SQLite con migración; los nombres de categoría existentes se conservan.

Criterio de listo: el selector se ve igual que el resto de la app, puedo crear una categoría nueva y usarla al instante, y borrar una categoría en uso no deja datos huérfanos.

## 4. Pagos e ingresos fijos: que los agregue el propio usuario

Cambio pedido:
- La sección de pagos e ingresos fijos no debe traer nada precargado. Cada persona agrega los suyos (alquiler, luz, internet, sueldo...), sin plantillas impuestas.
- Cuando no hay ninguno, mostrar un estado vacío con una acción clara ("Agrega tu primer pago fijo").
- El flujo de crear un pago fijo es el mismo en el inicio de la app (paso 5 de 5), en el tutorial y dentro de la pestaña Fijos, para que no haya dos formas distintas de hacer lo mismo.
- En el paso 5 de 5, hacer opcional "Terminar" sin agregar nada, y que "Agregar este gasto" confirme con el check de éxito (sección 10.2 de `DESIGN.md`).

## 5. Bug: un pago fijo eliminado sigue apareciendo

Reportado: cuando se crea un pago fijo al empezar la app o en el tutorial y luego se elimina, "se queda ahí".

Qué hacer:
- Reproducirlo primero: crear un pago fijo en el onboarding, eliminarlo y revisar qué lo vuelve a mostrar (la plantilla recurrente que regenera cada mes, datos de ejemplo del tutorial, o el onboarding que lo recrea al reabrirse).
- Corregir la causa raíz, no esconderlo en la interfaz.
- Al eliminar un pago fijo, preguntar el alcance: **solo este mes** o **este y los siguientes**. Eliminar la plantilla recurrente cuando se elige "este y los siguientes".
- Los pagos ya marcados como pagados en meses anteriores se conservan en el historial.
- Los datos de ejemplo del tutorial no deben guardarse en la base de datos real.
- Agregar una prueba que cubra: crear, eliminar y volver a abrir la app sin que reaparezca.

Criterio de listo: elimino un pago fijo, cierro y abro la app, y no vuelve a salir.

## 6. Tutorial más interactivo

Cambio pedido: que el tutorial lleve directamente a las opciones reales de la aplicación, para que cada persona sepa dónde está cada cosa.

Qué hacer:
- Sustituir las diapositivas de solo texto por un recorrido guiado sobre las pantallas reales: un resaltado (spotlight) alrededor del elemento real y una tarjeta corta que lo explique.
- Pasos sugeridos: balance del mes en Inicio, selector de mes, pestaña Fijos (agregar el primer pago), Ahorros, Resumen.
- En los pasos de acción ("agrega tu primer pago fijo") la persona toca el elemento real y el recorrido avanza solo, en vez de leer y pulsar Siguiente.
- Siempre visible: "Saltar" y "Atrás"; progreso corto (por ejemplo 3 de 6).
- Se puede repetir desde ajustes ("Ver recorrido otra vez").
- Todo lo que se cree durante el recorrido es dato real del usuario, y se puede borrar con el flujo normal del punto 5.
- Mantener los textos cortos (ver criterios del punto 1).

Criterio de listo: una persona nueva puede completar el recorrido sabiendo dónde está cada sección, y puede saltarlo en cualquier momento.

## 7. Diseño más intuitivo

Antes de cambiar nada, revisa cada pantalla contra `DESIGN.md` y entrégame una lista corta de hallazgos con la pantalla, el problema y la propuesta. Aplica solo lo que yo apruebe.

Qué buscar:
- Elementos que se superponen, textos cortados o con poco contraste, y letras menores a 15 px.
- Controles nativos de Android que rompen el estilo (selectores, fecha, diálogos).
- Zonas táctiles menores a 48 px.
- Pantallas sin estado vacío o sin acción clara.
- Acciones principales escondidas o con nombres ambiguos.
- Diferencias de espaciado, radios o colores respecto a `DESIGN.md`.

## Propuestas adicionales (preguntar antes de hacerlas)

- Permitir "Omitir por ahora" en el paso del sueldo, para quien no quiera configurarlo al inicio.
- Aviso opcional de pago fijo próximo a vencer.