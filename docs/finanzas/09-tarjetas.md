# 9. Tarjetas de crédito

[← Índice](../../Finanzas_SPEC.md#0-índice)

No existe todavía. Depende de [Cuentas](03-cuentas.md): una tarjeta es una cuenta de tipo `tarjeta` con datos extra.

### Tarjetas de crédito

#### Datos de la tarjeta

**Propósito:** saber cuánto se debe en cada tarjeta y cuánto cupo queda.

**Funciones:**
- [x] [Después] Fecha de corte, fecha de pago y límite.
- [x] [Después] Utilización = deuda actual / límite, con aviso desde el 30%.
- [x] [Después] Las compras con tarjeta son gastos de esa cuenta (cuentan en el mes de la compra, no del pago).

**Campos y datos:**

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| Cuenta | referencia a `accounts` de tipo `tarjeta` | Sí | |
| Día de corte | 1-31 | Sí | |
| Día de pago | 1-31 | Sí | Distinto del de corte. |
| Límite | centavos | Sí | Mayor que 0. |
| Últimos 4 dígitos | texto | No | 4 dígitos. Nunca el número completo, el CVV ni la fecha de vencimiento. |

**Reglas de negocio:**
- La deuda de la tarjeta es el saldo negativo de su cuenta.
- El pago es una transferencia, no un gasto, para no contar dos veces la misma compra.

**Acciones y estados:**
- Crear, editar y archivar (solo con saldo 0).
- Barra de utilización con texto.

**Casos borde y errores:**
- Saldo a favor (pagó de más): se muestra como crédito disponible, no como deuda negativa.
- Límite reducido por debajo de la deuda: utilización mayor al 100%, mostrada con aviso.

#### Estado de cuenta y pago

**Propósito:** pagar lo correcto a tiempo.

**Funciones:**
- [x] [Después] Estado del ciclo: compras entre el corte anterior y el actual, total a pagar y fecha límite.
- [ ] [Después] Pago mínimo (escrito por el usuario según su banco) contra pago total.
- [x] [Después] "Pagar" crea una transferencia desde la cuenta elegida.

**Campos y datos:** pago mínimo (centavos) por ciclo, escrito a mano porque cada banco lo calcula distinto.

**Reglas de negocio:** pagar menos del total deja saldo para el ciclo siguiente; la app no calcula intereses del banco.

**Acciones y estados:** recordatorio del pago con el mismo mecanismo que los gastos fijos.

**Casos borde y errores:** día de corte 31 en meses de 30 días: el corte es el último día del mes.
