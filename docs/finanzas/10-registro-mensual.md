# 10. Registro mensual (selector de mes en todas las pestañas)

[← Índice](../../Finanzas_SPEC.md#0-índice)

### Registro mensual

#### Vista por mes

**Propósito:** que toda la app muestre un mes a la vez.

**Funciones:**
- [x] [MVP] Selector de mes compartido por Inicio, Movimientos, Fijos y Ahorro. Flechas para el mes anterior y el siguiente.
- [x] [MVP] Tocar el nombre del mes abre una cuadrícula con los 12 meses, cambio de año e "Ir al mes actual".
- [x] [MVP] Los registros nuevos proponen una fecha dentro del mes visto.

**Campos y datos:** el mes visto vive solo en memoria (`MonthState`) y al abrir la app es el mes actual.

**Reglas de negocio:** el mes es un filtro por fecha (`date >= YYYY-MM-01 AND date <= YYYY-MM-31`), nunca una copia de datos.

**Acciones y estados:**
- Cambiar de mes recarga todas las pestañas.
- El mes actual se marca con un borde y el elegido, relleno.

**Casos borde y errores:**
- Cambios rápidos de mes: solo se muestra la última respuesta.
- Años lejanos: sin límite; los meses vacíos muestran su estado vacío.

#### Cierre y reapertura de mes

**Propósito:** dar por terminado un mes para que nada lo cambie por accidente.

**Funciones:**
- [ ] [Después] "Cerrar mes" con un resumen previo: fijos pendientes, balance final y % de ahorro.
- [ ] [Después] "Reabrir mes" con confirmación y motivo, registrado en la auditoría.

**Campos y datos:** `month_closures` (`month` PK, `closed_at`, `reopened_at`, `reason`).

**Reglas de negocio:**
- En un mes cerrado no se puede crear, editar ni borrar movimientos, aportes ni presupuestos con fecha de ese mes.
- Los fijos pendientes no se generan en meses cerrados.

**Acciones y estados:**
- Candado visible en el selector de mes.
- Los formularios explican por qué no se puede guardar.

**Casos borde y errores:**
- Editar un movimiento de un mes abierto moviéndolo a uno cerrado: bloqueado.
- Importar filas de meses cerrados: se omiten y se informan.

#### Comparativo con meses anteriores

**Propósito:** saber si este mes va mejor o peor.

**Funciones:**
- [ ] [Después] En Inicio: diferencia de gasto e ingreso contra el mes anterior, con flecha y texto.
- [ ] [Después] Tabla de los últimos 6 meses: ingresos, gastos, ahorrado y balance.

**Campos y datos:** calculado con `summarizeMonth` mes a mes.

**Reglas de negocio:** si el mes anterior no tiene datos, no hay comparación (no se compara contra 0).

**Acciones y estados:** tocar un mes de la tabla navega a él.

**Casos borde y errores:** comparar el mes en curso con un mes completo puede engañar; se indica "hasta el día X".
