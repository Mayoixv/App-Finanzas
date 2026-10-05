# 8. Pagos recurrentes y suscripciones (pestaña "Fijos")

[← Índice](../../Finanzas_SPEC.md#0-índice)

### Pagos recurrentes y suscripciones

#### Gastos fijos recurrentes

**Propósito:** no olvidar los pagos de todos los meses y ver lo pendiente.

**Funciones:**
- [x] [MVP] Crear gasto fijo con nombre, monto mensual, categoría de tipo fijo y día de vencimiento.
- [x] [MVP] Cada mes genera su instancia Pendiente desde el mes de inicio, nunca en meses anteriores.
- [x] [MVP] "Marcar como pagado": crea el gasto en Movimientos y pasa a Pagado, con check de éxito.
- [x] [MVP] Resumen: pendiente del mes, barra de pagado y total. Si todo está pagado, dice "Todo pagado".
- [x] [MVP] Editar con el lápiz. Cambia lo pendiente desde el mes visto; los meses anteriores y lo pagado no cambian.
- [x] [Después] Ingresos recurrentes (sueldo fijo) con "Marcar como recibido".

**Campos y datos:**

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| Nombre | texto | Sí | Recortado, no vacío. |
| Monto mensual | centavos | Sí | Mayor que 0. |
| Categoría | referencia a `categories` | Sí | Tipo `fijo`. |
| Día de vencimiento | entero 1-31 | Sí | En meses cortos se ajusta al último día (31 en febrero pasa al 28 o 29). |
| Mes de inicio | `YYYY-MM` | Sí | El mes visto al crearlo. |

**Reglas de negocio:**
- La instancia guarda el monto de su mes, así que editar el monto no reescribe el pasado.
- Pagar en el mes actual usa la fecha de hoy; pagar en otro mes usa la fecha de vencimiento, para que cuente en ese mes.
- Borrar el movimiento de un pago devuelve el fijo a Pendiente.

**Acciones y estados:**
- Crear, editar, pagar y eliminar desde un mes.
- Los vencidos y los que vencen en 3 días o menos se muestran en ámbar con texto ("Venció hace 3 días").
- **Vacío:** "Aún no tienes gastos fijos en {mes}".

**Casos borde y errores:**
- Pagar dos veces: bloqueado ("Este gasto ya está pagado").
- Si falla marcar Pagado después de crear el gasto, el gasto se borra para no pagar dos veces.
- Dos cargas a la vez nunca pisan un pago.

#### Suscripciones

**Propósito:** ver cuánto se va en servicios que se renuevan solos (streaming, apps, gimnasio).

**Funciones:**
- [x] [MVP] Hoy se manejan como gasto fijo con la categoría "Suscripciones".
- [ ] [Después] Total mensual y anual de suscripciones en Fijos.
- [x] [Después] Periodicidad mensual, trimestral, semestral o anual.

**Campos y datos:** [Después] `frequency` (`mensual`, `trimestral`, `anual`) en `recurring_expenses`. Una suscripción anual genera instancia solo en su mes.

**Reglas de negocio:** el costo anual se calcula según la periodicidad (mensual × 12, trimestral × 4, anual × 1).

**Acciones y estados:** igual que los gastos fijos.

**Casos borde y errores:** suscripción anual con vencimiento el 29 de febrero: en años no bisiestos vence el 28.

#### Próximos vencimientos y recordatorios

**Propósito:** pagar a tiempo.

**Funciones:**
- [x] [MVP] Vencimiento relativo en cada tarjeta ("Vence mañana", "Vence en 2 días", "Venció ayer").
- [ ] [Después] Notificación local el día anterior y el día del vencimiento, con hora configurable.
- [x] [Después] Lista "Próximos 7 días" en Inicio.

**Campos y datos:** `due_date` de la instancia. [Después] `remind_days_before` (0 a 7) por gasto fijo.

**Reglas de negocio:** no se recuerda un fijo ya pagado ni de un mes cerrado.

**Acciones y estados:** tocar la notificación abre Fijos en ese mes.

**Casos borde y errores:** el teléfono reinició: las notificaciones locales se reprograman al abrir la app.

#### Pausar y cancelar

**Propósito:** dejar de pagar un fijo sin perder lo ya pagado.

**Funciones:**
- [x] [MVP] "Eliminar gasto fijo" desde el mes visto. Borra lo pendiente de ese mes en adelante y conserva lo pagado. Si nunca tuvo un pago, se borra por completo.
- [x] [Después] Pausar por N meses (no genera instancias) y reanudar.

**Campos y datos:** `active` 0/1 (ya existe en la tabla). [Después] `paused_until` (`YYYY-MM`).

**Reglas de negocio:** un fijo inactivo no genera meses nuevos, pero sus meses pasados siguen visibles.

**Acciones y estados:** la confirmación dice desde qué mes deja de aparecer.

**Casos borde y errores:** eliminar desde un mes pasado también quita los pendientes de los meses siguientes.
