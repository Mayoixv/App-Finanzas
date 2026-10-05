# 11. Reportes

[← Índice](../../Finanzas_SPEC.md#0-índice)

Pantalla nueva [Después]. Cada gráfica lleva como título la pregunta que responde y tiene alternativa en texto o tabla para lectores de pantalla.

### Reportes

#### Gastos por categoría

**Propósito:** ver en qué se va el dinero.

**Funciones:**
- [x] [MVP] Dona del mes en Inicio, con las 5 mayores y "Otras", y leyenda con monto y %.
- [ ] [Después] Rango de meses (3, 6, 12) y tocar una categoría para ver sus movimientos.

**Campos y datos:** `expenseBreakdown` sobre los movimientos de categorías `fijo` y `variable`.

**Reglas de negocio:**
- Los ingresos, los aportes y las transferencias no entran.
- Los colores de la dona son de la familia violeta más dos acentos; nunca verde ni rojo, que significan dinero que entra o sale.

**Acciones y estados:** **Vacío:** "Aún no registras gastos en {mes}".

**Casos borde y errores:** una sola categoría ocupa el 100% del anillo, sin separador.

#### Ingresos vs. gastos y tendencias

**Propósito:** ver si se gasta más de lo que entra a lo largo del tiempo.

**Funciones:**
- [ ] [Después] Barras por mes: ingresos contra gastos, más la línea de balance.
- [ ] [Después] Tendencia por categoría (línea de 6 meses).
- [ ] [Después] Flujo de caja y patrimonio neto (ver [Dashboard](01-dashboard.md)).

**Campos y datos:** `summarizeMonth` por mes. No guarda datos.

**Reglas de negocio:** los meses sin movimientos aparecen con valor 0 solo si están entre dos meses con datos.

**Acciones y estados:** tocar una barra lleva a ese mes.

**Casos borde y errores:** con menos de 2 meses de datos se muestra "Hacen falta al menos 2 meses para ver una tendencia".

#### Reportes personalizados y guardados

**Propósito:** repetir una consulta propia sin rearmarla.

**Funciones:**
- [ ] [Después] Armar un reporte con rango, categorías, etiquetas y cuentas.
- [ ] [Después] Guardarlo con nombre.
- [ ] [Después] Exportarlo a CSV o PDF.

**Campos y datos:** `saved_reports` (`id`, `name`, `filters` JSON).

**Reglas de negocio:** un reporte guardado guarda los filtros, no los resultados; siempre se calcula con los datos actuales.

**Acciones y estados:** crear, renombrar, duplicar y eliminar.

**Casos borde y errores:** el filtro apunta a una categoría eliminada: se ignora con un aviso.
