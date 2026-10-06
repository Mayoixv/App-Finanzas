# 7. Deudas y préstamos (pestaña "Dinero" › Deudas)

[← Índice](../../Finanzas_SPEC.md#0-índice)

No existe todavía. Todo [Después].

### Deudas y préstamos

#### Deudas y préstamos

**Propósito:** saber cuánto se debe, a quién y cuándo se termina de pagar.

**Funciones:**
- [x] [Después] Registrar deudas (préstamo bancario, préstamo personal, financiamiento).
- [x] [Después] Registrar préstamos hechos a otros (me deben).
- [x] [Después] Saldo pendiente y fecha estimada de fin.

**Campos y datos:**

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| Nombre | texto | Sí | No vacío. |
| Dirección | `debo` / `me_deben` | Sí | |
| Monto original | centavos | Sí | Mayor que 0. |
| Tasa anual | porcentaje con 2 decimales | No | 0 a 200. |
| Plazo | meses | No | 1 a 600. |
| Fecha de inicio | `YYYY-MM-DD` | Sí | Fecha válida. |
| Día de pago | 1-31 | No | Igual que en los gastos fijos. |

**Reglas de negocio:**
- Saldo pendiente = monto original + intereses devengados − pagos.
- Cada pago de una deuda crea un movimiento de gasto (categoría "Pago de deudas"), y solo la parte de interés cuenta como gasto en los reportes.

**Acciones y estados:** crear, editar, registrar pago, marcar como saldada y archivar.

**Casos borde y errores:**
- Pago mayor al saldo: se pide confirmación y se registra el exceso como saldo a favor.
- Tasa 0%: cuotas iguales sin interés.

#### Cuotas e intereses

**Propósito:** ver el calendario de pagos y cuánto de cada cuota es interés.

**Funciones:**
- [x] [Después] Tabla de amortización (sistema francés: cuota fija).
- [x] [Después] Próximas cuotas en Fijos (con su número, fecha y "Registrar pago"; suman al por pagar del mes).

**Campos y datos:** calculado desde la deuda. `debt_payments` (`debt_id`, `date`, `amount`, `principal`, `interest`, `transaction_id`).

**Reglas de negocio:**
- Interés mensual = saldo × tasa anual / 12, redondeado al centavo.
- La última cuota absorbe la diferencia de redondeo.

**Acciones y estados:** marcar una cuota como pagada crea el movimiento.

**Casos borde y errores:** pago parcial de cuota: reduce primero el interés y luego el capital.

#### Simulador y estrategias

**Propósito:** decidir cómo pagar antes y cuánto se ahorra en intereses.

**Funciones:**
- [x] [Después] Simulador de pago anticipado: con X extra al mes, cuántos meses e intereses se ahorran.
- [x] [Después] Estrategias bola de nieve (menor saldo primero) y avalancha (mayor tasa primero), comparadas.

**Campos y datos:** entrada: monto extra mensual. Solo lectura de las deudas.

**Reglas de negocio:** la simulación no cambia datos; es una vista.

**Acciones y estados:** comparar las dos estrategias lado a lado (se puede usar el cambio de vista de design.md 10.3).

**Casos borde y errores:** deudas sin tasa: se ordenan solo por saldo, con aviso.
