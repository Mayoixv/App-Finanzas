# 3. Cuentas (pestaña "Dinero" › Cuentas)

[← Índice](../../Finanzas_SPEC.md#0-índice)

No existe todavía. Es la base de transferencias, tarjetas y patrimonio, así que conviene hacerla antes que esos menús.

### Cuentas

#### Lista de cuentas

**Propósito:** saber dónde está el dinero (efectivo, banco, ahorros, tarjeta, inversión) y cuánto hay en cada lugar.

**Funciones:**
- [x] [MVP] Crear, editar y listar cuentas con su saldo actual.
- [x] [MVP] Cuenta "Efectivo" creada por la migración, a la que se asignan todos los movimientos existentes.
- [x] [MVP] Elegir la cuenta al registrar un movimiento (por defecto, la última usada).
- [x] [Después] Cuentas de inversión con saldo actualizado a mano (sin cotizaciones en línea): tipo "Inversión" y "Saldo de hoy" al editarla.

**Campos y datos:**

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| Nombre | texto | Sí | Único sin distinguir mayúsculas. |
| Tipo | `efectivo` / `banco` / `ahorros` / `tarjeta` / `inversion` | Sí | Solo esos valores. |
| Saldo inicial | centavos | Sí | Puede ser 0 o negativo (tarjeta). |
| Moneda | DOP / USD | Sí | Hasta la multimoneda, igual a la de Ajustes. |
| Últimos 4 dígitos | texto | No | Exactamente 4 dígitos. Nunca el número completo. |

**Reglas de negocio:** saldo = saldo inicial + entradas − salidas de sus movimientos. Nunca se edita el saldo directamente.

**Acciones y estados:**
- Crear, editar nombre y tipo, archivar. Orden manual.
- **Vacío:** solo existe "Efectivo".

**Casos borde y errores:** cambiar el saldo inicial recalcula todo el historial, así que se pide confirmación.

#### Conciliación de saldo

**Propósito:** igualar el saldo de la app con el del banco.

**Funciones:**
- [x] [Después] "Conciliar": el usuario escribe el saldo real y la app ajusta el saldo inicial por la diferencia (sin crear un movimiento, para que no cuente como ingreso o gasto del mes).

**Campos y datos:** saldo real (centavos) y fecha. El ajuste usa la categoría especial "Ajuste de saldo", que no cuenta como ingreso ni gasto.

**Reglas de negocio:** el ajuste queda visible en la lista y en la auditoría; nunca se reescriben movimientos existentes.

**Acciones y estados:** vista previa de la diferencia antes de confirmar.

**Casos borde y errores:** diferencia 0, con el mensaje "La cuenta ya cuadra" y sin crear movimiento.

#### Archivar cuenta

**Propósito:** dejar de ver cuentas cerradas sin perder su historial.

**Funciones:**
- [x] [Después] Archivar y desarchivar.

**Campos y datos:** `archived_at`.

**Reglas de negocio:**
- No se puede archivar con saldo distinto de 0; se ofrece conciliar o transferir primero.
- No se ofrece en formularios nuevos.

**Acciones y estados:** sección "Archivadas" plegada al final de la lista.

**Casos borde y errores:** archivar la única cuenta activa está bloqueado, con el motivo explicado.
