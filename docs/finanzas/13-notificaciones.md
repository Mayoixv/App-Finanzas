# 13. Notificaciones

[← Índice](../../Finanzas_SPEC.md#0-índice)

No existe todavía. Solo notificaciones **locales** (plugin `@capacitor/local-notifications`), sin servidor ni push.

### Notificaciones

#### Tipos y preferencias

**Propósito:** recordar lo importante sin abrir la app y sin molestar.

**Funciones:**
- [x] [Después] Gasto fijo por vencer (el día anterior y el mismo día).
- [x] [Después] Presupuesto al 85% y al 100% (una vez por umbral, categoría y mes).
- [ ] [Después] Pago de tarjeta por vencer.
- [x] [Después] Recordatorio diario opcional para registrar gastos ("¿Registraste tus gastos de hoy?"). No suena si ya se anotó algo ese día.
- [x] [Después] Preferencias: activar o desactivar cada tipo, hora de los fijos y hora del recordatorio diario.
- [ ] [Después] Horas de silencio.

**Campos y datos:** en `settings`: `notify_fixed`, `notify_budget`, `notify_cards`, `notify_daily` (0/1), `notify_daily_time` (`HH:MM`), `quiet_from` y `quiet_to`.

**Reglas de negocio:**
- Todas desactivadas hasta que el usuario las activa.
- Pedir el permiso de Android 13+ solo al activar la primera.
- Nunca incluir montos en el texto de la notificación si el bloqueo con PIN está activo (se leen en la pantalla bloqueada).
- Las de horas de silencio se mueven al final de ese horario.

**Acciones y estados:**
- Tocar la notificación abre la pantalla correspondiente en el mes correcto.
- **Permiso denegado:** el interruptor queda apagado, con el texto "Activa las notificaciones en los ajustes de Android" y un botón que abre esos ajustes.

**Casos borde y errores:**
- Reinicio del teléfono o cambio de hora: se reprograman al abrir la app.
- Fijo pagado antes de la hora: se cancela su notificación.
