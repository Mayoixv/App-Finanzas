# 2. Transacciones (pestaña "Movimientos")

[← Índice](../../Finanzas_SPEC.md#0-índice)

### Transacciones

#### Ingresos y gastos

**Propósito:** registrar cada entrada y salida de dinero del mes.

**Funciones:**
- [x] [MVP] Crear con selector Gasto/Ingreso, categoría, monto, fecha y nota.
- [x] [MVP] Editar tocando la fila o desde el menú "⋯".
- [x] [MVP] Duplicar: abre un movimiento nuevo con los mismos datos y la fecha propuesta.
- [x] [MVP] Eliminar con confirmación. Si era el pago de un gasto fijo, ese fijo vuelve a Pendiente.
- [x] [MVP] Lista del mes ordenada de más reciente a más antigua, con ingresos en verde y signo `+`.
- [x] [MVP] Cuenta de origen o destino (ver [Cuentas](03-cuentas.md)).
- [x] [Después] Recordar la última categoría usada por tipo.

**Campos y datos:**

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| Tipo | Gasto / Ingreso | Sí | Filtra las categorías ofrecidas. |
| Categoría | referencia a `categories` | Sí | Debe existir. Para Gasto: `fijo` o `variable`; para Ingreso: `ingreso`. |
| Monto | centavos (entero) | Sí | Mayor que 0. Se escribe con hasta 2 decimales y se redondea al centavo. |
| Fecha | `YYYY-MM-DD` | Sí | Debe existir en el calendario. Propuesta: hoy en el mes actual o el mismo día en el mes visto. |
| Nota | texto | No | Se recortan los espacios. Si hay nota, es el título de la fila. |

**Reglas de negocio:**
- El monto siempre es positivo; el signo lo da el tipo de la categoría.
- Un movimiento se ve en el mes de su fecha. Si se guarda con fecha de otro mes, no aparece en el mes actual.

**Acciones y estados:**
- Crear, editar, duplicar y eliminar. No hay archivado.
- **Vacío:** "Sin movimientos en {mes}".
- **Error de lectura**, y check de éxito al guardar.
- [x] [MVP] "Deshacer" durante 5 s tras eliminar (se guarda una copia y se restaura, con sus fotos).

**Casos borde y errores:**
- Monto 0, negativo o texto: el botón Guardar queda desactivado.
- Fecha imposible: "Fecha inválida".
- Categoría borrada mientras el formulario estaba abierto: "Categoría no encontrada".
- Fallo al guardar: "No se pudo guardar. Inténtalo de nuevo." y no se cierra el formulario.

#### Transferencias

**Propósito:** mover dinero entre cuentas propias sin que cuente como ingreso ni gasto.

**Funciones:**
- [x] [Después] Crear transferencia: cuenta origen, cuenta destino, monto, fecha y nota.
- [ ] [Después] Editar y eliminar las dos partes juntas.

**Campos y datos:** `transfer_id` compartido por dos movimientos (salida en origen, entrada en destino). Monto en centavos > 0. Origen distinto de destino.

**Reglas de negocio:**
- No suma al resumen mensual ni a los reportes de gasto.
- Pagar una tarjeta es una transferencia de una cuenta a la tarjeta.

**Acciones y estados:**
- Se muestra como una sola fila con flecha (origen → destino).
- Borrar una parte borra la otra.

**Casos borde y errores:**
- Cuentas en monedas distintas: bloqueado hasta que exista multimoneda.
- Origen archivado: no se ofrece.

#### División de una transacción (split)

**Propósito:** repartir un pago entre varias categorías (por ejemplo, una compra de supermercado con comida y limpieza).

**Funciones:**
- [x] [Después] Agregar partes con categoría y monto.
- [ ] [Después] Mostrar lo que falta por asignar.

**Campos y datos:** `transaction_splits` (`transaction_id`, `category_id`, `amount`). La suma de las partes es igual al total, al centavo.

**Reglas de negocio:** el resumen y los reportes usan las partes, no la categoría principal. Todas las partes son del mismo tipo (todas gasto o todas ingreso).

**Acciones y estados:**
- Guardar se desactiva mientras la suma no coincida.
- Quitar todas las partes vuelve a un movimiento simple.

**Casos borde y errores:** total editado después de dividir: se pide reajustar las partes antes de guardar.

#### Adjuntos y notas

**Propósito:** guardar contexto de un movimiento.

**Funciones:**
- [x] [MVP] Nota de texto libre.
- [x] [Después] Foto del recibo (cámara o galería), hasta 3, reducida y guardada en la base local.

**Campos y datos:** `note` TEXT. Adjuntos: `attachments` (`transaction_id`, `path`, `mime`), con un máximo de 3 por movimiento y 5 MB por imagen.

**Reglas de negocio:** los adjuntos se borran con el movimiento y se incluyen en el respaldo completo.

**Acciones y estados:** ver la imagen, reemplazarla o quitarla.

**Casos borde y errores:** permiso de cámara denegado: se explica cómo activarlo y se ofrece la galería.

#### Etiquetas

**Propósito:** agrupar movimientos que cruzan categorías (por ejemplo, "viaje a Samaná").

**Funciones:**
- [x] [Después] Asignar varias etiquetas a un movimiento.
- [ ] [Después] Filtrar y sumar por etiqueta.

**Campos y datos:** `tags` (`id`, `name` único), `transaction_tags` (`transaction_id`, `tag_id`).

**Reglas de negocio:** las etiquetas no afectan el resumen; solo filtran.

**Acciones y estados:** crear al escribir, renombrar y eliminar (quita la etiqueta de los movimientos, no los borra).

**Casos borde y errores:** nombre repetido sin distinguir mayúsculas: se reutiliza la existente.

#### Búsqueda y filtros avanzados

**Propósito:** encontrar un movimiento sin recorrer meses.

**Funciones:**
- [x] [MVP] Buscar por texto en la nota y el nombre de la categoría, dentro del mes visto.
- [x] [MVP] Filtrar por categoría y por tipo.
- [ ] [Después] Buscar en todos los meses; filtrar por rango de montos, fechas, cuenta y etiqueta.

**Campos y datos:** consulta con `LIKE` sobre `note` (con un índice si pasa de 10,000 filas).

**Reglas de negocio:** los filtros no cambian el resumen de Inicio; solo la lista.

**Acciones y estados:**
- Chip por filtro activo, y "Quitar filtros".
- **Vacío:** "Ningún movimiento coincide con «texto»".

**Casos borde y errores:** búsqueda con acentos: `cafe` debe encontrar `café`.

#### Edición masiva

**Propósito:** corregir muchos movimientos de una vez (por ejemplo, tras importar).

**Funciones:**
- [ ] [Después] Seleccionar varios con pulsación larga.
- [x] [Después] Cambiar la categoría o la fecha a todos.
- [x] [Después] Eliminar con una confirmación.

**Campos y datos:** opera sobre `transactions`; cada cambio queda en `audit_log`.

**Reglas de negocio:**
- Todo el lote se aplica en una transacción: o todos o ninguno.
- Movimientos de meses cerrados quedan fuera del lote.

**Acciones y estados:** barra de selección con el conteo y "Deshacer" tras aplicar.

**Casos borde y errores:** si el lote incluye pagos de gastos fijos y se eliminan, esos fijos vuelven a Pendiente.
