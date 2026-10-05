# 4. Categorías (en Ajustes)

[← Índice](../../Finanzas_SPEC.md#0-índice)

### Categorías

#### Categorías y subcategorías

**Propósito:** clasificar cada movimiento para saber en qué se va el dinero.

**Funciones:**
- [x] [MVP] Lista agrupada en Ingresos, Gastos fijos y Gastos variables.
- [x] [MVP] Crear con nombre y tipo.
- [x] [MVP] Renombrar.
- [x] [MVP] Eliminar solo si nada la usa.
- [ ] [Después] Subcategorías de un nivel (por ejemplo, Comida › Supermercado). Los reportes suman hacia la categoría padre.
- [ ] [Después] Ícono y color por categoría.

**Campos y datos:**

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| Nombre | texto | Sí | Recortado, no vacío, único sin distinguir mayúsculas en toda la app. |
| Tipo | `ingreso` / `fijo` / `variable` | Sí | Solo al crear; no se cambia después. |
| Padre | referencia a `categories` | No | [Después] Mismo tipo que el padre; un solo nivel. |

**Reglas de negocio:** el tipo no se puede cambiar, porque cambiaría el sentido de los movimientos ya registrados.

**Acciones y estados:** crear, renombrar y eliminar. Lista vacía por tipo: "Sin categorías de este tipo".

**Casos borde y errores:**
- Nombre repetido: "Ya tienes una categoría con ese nombre".
- Eliminar en uso: "Esta categoría tiene movimientos o gastos fijos. Cámbiales la categoría o bórralos antes de eliminarla."

#### Categorías por defecto

**Propósito:** que la app sirva desde el primer minuto.

**Funciones:**
- [x] [MVP] 10 categorías iniciales:
  - **Ingresos:** Salario, Otros ingresos.
  - **Fijos:** Alquiler, Servicios, Suscripciones.
  - **Variables:** Comida, Transporte, Salud, Ocio, Otros gastos.
- [ ] [Después] Restaurar las categorías por defecto que falten.

**Campos y datos:** insertadas por la migración 2 con id fijo (`cat-salario`, etc.).

**Reglas de negocio:** son categorías normales: se pueden renombrar o eliminar como cualquiera.

**Acciones y estados:** ninguna propia.

**Casos borde y errores:** restaurar no duplica una categoría si el usuario la renombró, porque compara por id.

#### Reglas de auto-categorización

**Propósito:** que movimientos repetidos o importados tomen la categoría solos.

**Funciones:**
- [ ] [Después] Regla "si la nota contiene «texto», usar la categoría X".
- [ ] [Después] Sugerir una regla al categorizar 3 veces la misma nota.

**Campos y datos:** `categorization_rules` (`pattern` texto, `category_id`, `priority`).

**Reglas de negocio:**
- Solo sugieren la categoría en el formulario y en la importación; nunca cambian movimientos ya guardados.
- Si hay varias coincidencias, gana la de mayor prioridad.

**Acciones y estados:** crear, editar, ordenar y eliminar reglas.

**Casos borde y errores:** patrón vacío o de menos de 3 caracteres, rechazado por demasiado amplio.

#### Reasignación al eliminar

**Propósito:** eliminar una categoría en uso sin perder sus movimientos.

**Funciones:**
- [x] [MVP] Hoy, eliminar está bloqueado si la categoría tiene movimientos o gastos fijos. Sus presupuestos se borran con ella.
- [ ] [Después] Al eliminar, elegir otra categoría del mismo tipo a la que pasan sus movimientos y gastos fijos.

**Campos y datos:** actualiza `category_id` en `transactions` y `recurring_expenses` en una transacción, y luego borra la categoría.

**Reglas de negocio:**
- La categoría destino debe ser del mismo tipo.
- Los presupuestos de la categoría eliminada se suman al presupuesto de la destino de ese mes, o se crean si no existía.

**Acciones y estados:** confirmación que dice cuántos movimientos se moverán.

**Casos borde y errores:** si es la última categoría de su tipo, no se puede eliminar.
