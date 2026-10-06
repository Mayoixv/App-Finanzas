# 5. Presupuestos (tarjeta en Inicio)

[← Índice](../../Finanzas_SPEC.md#0-índice)

### Presupuestos

#### Presupuesto por categoría y mes

**Propósito:** poner un límite de gasto por categoría y ver cuánto queda.

**Funciones:**
- [x] [MVP] Crear un presupuesto: categoría de gasto y límite para el mes visto.
- [x] [MVP] Editar el límite o eliminarlo, tocando el presupuesto.
- [x] [MVP] Ver lo gastado contra el límite con una barra y "Te quedan X" o "Te pasaste por X".
- [x] [MVP] Copiar los presupuestos del mes anterior cuando el mes no tiene ninguno.
- [ ] [Después] Presupuesto total del mes (suma de categorías y límite global).

**Campos y datos:**

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| Categoría | referencia a `categories` | Sí | De tipo `fijo` o `variable`. No se ofrecen las que ya tienen presupuesto ese mes. No se cambia al editar. |
| Mes | `YYYY-MM` | Sí | El mes visto. |
| Límite | centavos | Sí | Mayor que 0. |

**Reglas de negocio:**
- Hay un presupuesto por categoría y mes (restricción única en la base).
- Lo gastado es la suma de los movimientos del mes en esa categoría, incluidos los pagos de gastos fijos.
- Copiar no pisa los presupuestos que el mes destino ya tenga.

**Acciones y estados:**
- Lista ordenada por % usado, de mayor a menor.
- **Vacío:** invitación a agregar y, si el mes anterior tenía, botón "Copiar los de {mes}".
- Se muestra aunque el mes no tenga movimientos.

**Casos borde y errores:**
- Todas las categorías ya tienen presupuesto: el formulario lo dice.
- Si se elimina la categoría, sus presupuestos se borran en cascada (y la confirmación lo dice).

#### Presupuesto flexible (rollover)

**Propósito:** que lo que sobra (o falta) de un mes pase al siguiente.

**Funciones:**
- [x] [Después] Activar el rollover por presupuesto.
- [x] [Después] Límite efectivo = límite + sobrante del mes anterior (puede ser negativo si se pasó).

**Campos y datos:** `rollover` 0/1 en `budgets`. El sobrante se calcula, no se guarda.

**Reglas de negocio:** solo arrastra desde el mes inmediatamente anterior que tenga presupuesto de esa categoría con rollover.

**Acciones y estados:** la barra muestra el límite base y el arrastre por separado.

**Casos borde y errores:**
- Cadena de meses sin presupuesto: el arrastre se corta.
- Mes cerrado: el arrastre queda fijo.

#### Alertas de límite

**Propósito:** avisar antes de pasarse.

**Funciones:**
- [x] [MVP] Barra ámbar desde el 85% y roja con ícono y texto al pasarse.
- [x] [MVP] Llevar estas alertas a la fila de alertas de Inicio.
- [x] [Después] Notificación local al cruzar el 85% y el 100% (una vez por umbral y mes).

**Campos y datos:** umbral fijo del 85% (constante `BUDGET_WARNING_PERCENT`). [Después] configurable entre 50% y 95%.

**Reglas de negocio:** el estado no depende solo del color: hay texto ("Te pasaste por…") e ícono.

**Acciones y estados:** tocar el presupuesto abre su edición.

**Casos borde y errores:** límite igual a lo gastado: "Te quedan RD$0.00" y no cuenta como pasado (comparación exacta en centavos).

#### Comparativo real vs. presupuestado

**Propósito:** saber si los presupuestos son realistas.

**Funciones:**
- [ ] [Después] Tabla de los últimos 6 meses por categoría: presupuestado, gastado y diferencia.
- [ ] [Después] Sugerir un límite con el promedio de los últimos 3 meses.

**Campos y datos:** solo lectura de `budgets` y `transactions`.

**Reglas de negocio:** los meses sin presupuesto se muestran como "—", no como 0.

**Acciones y estados:** cambiar el rango (3, 6 o 12 meses).

**Casos borde y errores:** una categoría renombrada se muestra con su nombre actual.
