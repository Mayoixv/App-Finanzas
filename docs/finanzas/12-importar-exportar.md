# 12. Importar y exportar

[← Índice](../../Finanzas_SPEC.md#0-índice)

### Importar y exportar

#### Exportar

**Propósito:** sacar todos los datos del teléfono, para respaldarlos, analizarlos en Excel o cambiar de app.

**Funciones:**
- [x] [MVP] Exportación completa en JSON: todas las tablas, con la versión del esquema (es el respaldo cifrado).
- [ ] [MVP] Exportar movimientos a CSV (todos o por rango de meses).
- [ ] [Después] Exportar un mes o un reporte a PDF.

**Campos y datos:**
- **JSON:** `{ "app": "finanzas", "schemaVersion": 5, "exportedAt": "...", "categories": [...], "transactions": [...], ... }`. Los montos van en centavos.
- **CSV:** `fecha,tipo,categoría,monto,nota`. El monto va en decimal con punto (`1250.50`). Separador `,`, codificación UTF-8 con BOM para que Excel respete los acentos.

**Reglas de negocio:**
- Se exporta a un archivo que el usuario comparte o guarda (hoja de compartir de Android); la app no lo sube a ningún lado.
- [MVP] El JSON se puede cifrar con contraseña (ver [Respaldos](16-respaldos.md)).

**Acciones y estados:** progreso, y "Exportado: 1,234 movimientos" al terminar.

**Casos borde y errores:**
- Sin datos: se exporta igual, con listas vacías.
- Notas con comas o saltos de línea: van entre comillas (CSV estándar).

#### Importar CSV y Excel

**Propósito:** traer movimientos de una hoja de cálculo propia o de otra app.

**Funciones:**
- [ ] [Después] Elegir un archivo `.csv` o `.xlsx`.
- [ ] [Después] Mapear columnas: fecha, monto, descripción y, opcionalmente, categoría y tipo.
- [ ] [Después] Vista previa con errores y duplicados marcados.
- [x] [Después] Restaurar una exportación JSON completa (ver [Respaldos](16-respaldos.md)).

**Campos y datos:**
- **Formato de fecha:** elegible entre `DD/MM/AAAA`, `AAAA-MM-DD` y `MM/DD/AAAA`.
- **Monto:** con o sin símbolo. Coma o punto decimal, según elija el usuario. Negativos = gasto.

**Reglas de negocio:**
- Cada fila pasa por las mismas validaciones que un movimiento manual.
- Las filas con error se omiten y se listan; nunca se importa a medias en silencio.
- Todo el lote va en una transacción.

**Acciones y estados:** paso 1 archivo, paso 2 columnas, paso 3 vista previa, paso 4 confirmar. Se puede cancelar en cualquier paso.

**Casos borde y errores:**
- **Duplicado:** misma fecha, monto y descripción que un movimiento existente. Se marca y no se importa por defecto.
- **Archivo de más de 10 MB:** se rechaza con el motivo.
- **Categoría inexistente:** se ofrece crearla o asignar otra.

#### Importar estados de cuenta

**Propósito:** cargar el mes desde el estado del banco en vez de escribir cada compra.

**Funciones:**
- [ ] [Después] Plantillas de mapeo guardadas por banco.
- [ ] [Después] Auto-categorización con las reglas de [Categorías](04-categorias.md).

**Campos y datos:** `import_templates` (`bank`, `mapping` JSON, `date_format`, `decimal`).

**Reglas de negocio:**
- Solo archivos que el usuario descarga de su banco; la app no se conecta al banco.
- No se leen PDF protegidos.

**Acciones y estados:** elegir el banco y reutilizar su plantilla.

**Casos borde y errores:** el banco cambió el formato del archivo: si las columnas no coinciden, se pide mapear de nuevo.
