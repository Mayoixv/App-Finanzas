# ajuste2.md — Segunda ronda de cambios (feedback de un usuario que maneja finanzas en su trabajo)

Lee primero `CLAUDE.md`, `DESIGN.md` y `ajuste.md`. Este archivo se suma a `ajuste.md`; si algo choca con él o con el código existente, pregúntame antes de decidir.
Mismas reglas de trabajo: un punto a la vez, un commit por punto, todo cambio de esquema SQLite como migración que conserve los datos actuales, UI según `DESIGN.md` (si una skill y `DESIGN.md` se contradicen, manda `DESIGN.md`), textos en español, cortos y sin relleno.

## Orden de trabajo

1. Etiqueta "Disponible" (punto 1)
2. Colores distintos para Recibido y Pagado (punto 2)
3. Ayuda con un clic en cada sección (punto 3)
4. Sección Dinero: Cuenta, Efectivo y Tarjeta de crédito (punto 4)
5. Metas y Deudas por separado (punto 5)

Los puntos 1 a 3 son pequeños y visibles. Los puntos 4 y 5 cambian el modelo de datos, así que van al final y antes de construirlos debes confirmar conmigo las decisiones de la siguiente sección.

## Decisiones que debes preguntarme antes de construir los puntos 4 y 5

Trae una recomendación para cada una (la que propongo aquí abajo) y espera mi respuesta:

1. **Qué cuenta en "Disponible".** Propuesta: suma de los saldos de Cuenta y Efectivo. La tarjeta de crédito no suma, porque es dinero que se debe, no que se tiene.
2. **Gastos con tarjeta.** Propuesta: no reducen Disponible al momento de comprar; aumentan lo que se debe en la tarjeta. Pagar la tarjeta sí baja Disponible.
3. **Transferencias entre cuentas y pago de tarjeta.** Propuesta: incluirlas como movimientos que no son ingreso ni gasto, para no duplicar en el resumen del mes.
4. **Movimientos que ya existen.** Propuesta: crear una cuenta "Efectivo" por defecto, asignarles todo lo anterior y avisarme en el primer inicio con la opción de moverlos.
5. **Navegación.** Revisa las pestañas actuales de la barra inferior (máximo 5) y propón dónde van Dinero, Metas y Deudas antes de tocar nada. Mi idea: una pestaña Dinero, y una pestaña "Metas y deudas" con el cambio de dos vistas de la sección 10.3 de `DESIGN.md` (Metas | Deudas).

---

## 1. "Disponible" en lugar de "Tienes" (Inicio)

Cambio pedido: en Inicio, la etiqueta "Tienes" pasa a "Disponible".

Qué hacer:
- Buscar todas las apariciones de "Tienes" (Inicio, resumen, tutorial, textos de ayuda y el texto oculto para lectores de pantalla del contador giratorio, sección 10.5) y usar el mismo término en toda la app.
- Por ahora es solo la etiqueta. Cuando exista la sección Dinero (punto 4), "Disponible" pasará a calcularse según la decisión 1. Si el número que hoy se muestra no representa realmente lo disponible (por ejemplo, si es el balance del mes), avísame antes de dejarlo así.

Criterio de listo: no queda ningún "Tienes" en la interfaz.

## 2. Colores distintos para Recibido y Pagado

Problema: los estados "Recibido" y "Pagado" se ven demasiado parecidos y cuesta distinguir si el dinero entró o salió.

Propuesta (respeta la regla de `DESIGN.md`: verde significa dinero que entra, rojo solo alertas reales):

| Estado | Significado | Color | Ícono |
|---|---|---|---|
| Recibido | Dinero que entró | `--positive` (verde) | flecha hacia abajo / entrada |
| Pagado | Dinero que salió y ya se cumplió | violeta (`--violet-400` sobre fondo suave) | check |
| Pendiente | Aún no ocurre | `--warning` (ámbar) | reloj |
| Vencido | Debía pagarse y no se marcó | `--negative` (rojo) | alerta |

Qué hacer:
- Crear los tokens (por ejemplo `--paid`, `--received`) en `variables.scss` y documentarlos en la sección 2 de `DESIGN.md`; corregir la sección 4 donde hoy dice que "Pagado" es verde.
- Aplicarlos en todos los lugares donde aparezcan los estados: Fijos, Mes, listas de movimientos y filtros.
- No depender solo del color: cada chip lleva ícono y texto.
- Verificar contraste AA en fondo claro y oscuro.

Criterio de listo: en cualquier lista, reconozco de un vistazo qué entró, qué salió y qué falta.

## 3. Ayuda con un clic dentro de cada sección

Problema: las instrucciones solo aparecen en el tutorial del primer uso y después no hay forma de volver a verlas.

Qué hacer:
- Agregar un botón de ayuda ("?", zona táctil de 48 px, con `aria-label` como "Ayuda sobre Fijos") en el encabezado de cada pantalla: Inicio, Mes, Fijos, Dinero, Metas, Deudas y Resumen.
- Al tocarlo se abre una hoja inferior corta o el menú desplegable de la sección 10.4, con 2 a 3 viñetas y cierre al tocar fuera. No se muestra solo ni interrumpe.
- Guardar todos los textos en un solo archivo (por ejemplo `help.content.ts`), para que el tutorial interactivo de `ajuste.md` (punto 6) y esta ayuda usen exactamente los mismos textos.
- En Ajustes, agregar "Ayuda" con la lista de todas las secciones y "Ver recorrido otra vez".
- Criterios de texto: máximo 3 viñetas, 2 líneas cada una, verbo al inicio.

Borradores (ajústalos cuando el comportamiento de cada pantalla esté final):
- **Fijos:** Agrega los pagos e ingresos que se repiten cada mes. Márcalos como pagados o recibidos cuando ocurran. Pausa un pago unos meses o elimínalo solo de este mes.
- **Dinero:** Registra dónde tienes tu dinero: cuentas, efectivo y tarjetas. Cada movimiento sale de una de ellas. La tarjeta muestra cuánto debes, no cuánto tienes.
- **Metas:** Crea una meta con un monto objetivo. Aporta cuando puedas y mira cuánto llevas.
- **Deudas:** Anota lo que debes con su cuota y su día de pago. Al pagar la cuota desde Fijos, tu deuda baja sola.

Criterio de listo: puedo abrir la ayuda de cualquier pantalla con un toque, en cualquier momento, y se cierra sin cambiar nada.

## 4. Sección Dinero: Cuenta, Efectivo y Tarjeta de crédito

Cambio pedido: una sección Dinero con tres tipos de lugares donde está el dinero.

Modelo (entidad `Account`):
- `id`, `nombre`, `tipo` (`cuenta` | `efectivo` | `tarjeta`), `saldoInicial`, `oculta`.
- Solo tarjeta: `limite`, `diaCorte`, `diaPago`.
- Se pueden crear varias de cada tipo (por ejemplo dos cuentas de bancos distintos).
- Cada movimiento (ingreso, gasto, pago fijo, aporte a meta, pago de deuda) guarda su `accountId`.

Qué hacer:
- Pantalla Dinero con tres grupos (Cuenta, Efectivo, Tarjeta de crédito), el total de cada grupo y un botón "＋ Agregar" por grupo.
- Saldo de Cuenta y Efectivo = saldo inicial + ingresos − gastos − aportes ± transferencias.
- Tarjeta: mostrar lo que se debe (compras − pagos), el límite y una barra de uso con el estilo de `DESIGN.md`.
- Transferencias entre cuentas y pago de tarjeta como movimientos que no cuentan como ingreso ni gasto (decisión 3). No contarlos en el resumen del mes.
- El selector de cuenta reutiliza el selector propio de `ajuste.md` punto 3 (nada de diálogos nativos de Android), y recuerda la última cuenta usada.
- "Disponible" en Inicio se calcula según la decisión 1.
- Migración y primer inicio según la decisión 4.
- Paso opcional "¿Dónde tienes tu dinero?" en el onboarding, con opción de omitir.
- Estado vacío con una acción clara ("Agrega tu primera cuenta").
- Documentar en `DESIGN.md` los componentes nuevos (tarjeta de cuenta, barra de uso).

Criterio de listo: puedo crear una cuenta, efectivo y una tarjeta, registrar movimientos en cada una, ver sus saldos correctos y que "Disponible" refleje la regla acordada sin duplicar nada en el resumen.

## 5. Metas y Deudas por separado

Hoy las metas viven en "Ahorros" y las deudas solo existen como la categoría "Pago de deudas" dentro de los gastos fijos. Hay que separarlas.

**Metas** (`SavingsGoal`):
- Renombrar "Ahorros" a "Metas" en toda la app, incluidos tutorial y ayuda.
- Cada meta tiene nombre, monto objetivo, fecha opcional y aportes. Cada aporte sale de una cuenta o de efectivo y no cuenta como gasto.
- Barra de progreso como la actual.
- Verificar que el "Total ahorrado" y el "% ahorro" del resumen mensual sigan calculándose bien con los aportes a metas.

**Deudas** (`Debt`):
- Campos: nombre o acreedor, monto original, saldo pendiente, cuota, frecuencia (mensual o quincenal), día de pago, cuotas restantes y tasa opcional.
- Cada pago reduce el saldo pendiente.
- Vínculo con Fijos: al crear una deuda con cuota, ofrecer generar el pago fijo correspondiente. Marcar ese pago como pagado registra el pago de la deuda y baja el saldo en una sola acción, sin doble registro.
- Eliminar el pago fijo (según el alcance de `ajuste.md` punto 5) no borra la deuda, y borrar la deuda pregunta qué hacer con su pago fijo.
- Pantalla Deudas: total adeudado arriba, lista con saldo pendiente, próxima cuota y barra de avance. Las deudas saldadas pasan a una lista "Saldadas" como historial.
- Migración: los gastos que ya usan la categoría "Pago de deudas" se conservan como están. No crear deudas automáticamente; ofrecer "Crear deuda a partir de este pago" como acción opcional.
- Las tarjetas de crédito no se registran como Deuda: tienen su propio manejo en Dinero (punto 4).

**Navegación:** según la decisión 5. Propón la distribución y espera mi aprobación antes de construir.

Criterio de listo: puedo crear una meta y una deuda por separado, aportar a la meta desde una cuenta, pagar la cuota de la deuda desde Fijos viendo cómo baja el saldo, y el resumen del mes sigue cuadrando.

---

## Propuestas adicionales (preguntar antes de hacerlas)

- Aviso opcional de cuota de deuda y de pago de tarjeta próximos a vencer.
- Exportar el mes a CSV o Excel, útil para quien maneja finanzas y quiere revisar los datos fuera de la app.
- Respaldo manual de los datos (exportar e importar la base).
