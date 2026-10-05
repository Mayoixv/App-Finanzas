# 16. Respaldos y sincronización

[← Índice](../../Finanzas_SPEC.md#0-índice)

Hoy no existe ningún respaldo: si se pierde o se resetea el teléfono, se pierden todos los datos. Es el riesgo más alto del proyecto.

### Respaldos y sincronización

#### Respaldo manual y automático

**Propósito:** poder recuperar todo en otro teléfono o tras un reinicio de fábrica.

**Funciones:**
- [ ] [MVP] "Crear respaldo": genera la exportación JSON completa ([Exportar](12-importar-exportar.md#exportar)) cifrada con una contraseña y la comparte (Drive, correo, archivos).
- [ ] [MVP] "Restaurar respaldo": elegir el archivo, escribir la contraseña, ver un resumen (cuántos movimientos y de qué meses) y confirmar.
- [ ] [MVP] Respaldo automático local antes de cada migración que cambie datos.
- [ ] [Después] Respaldo automático semanal a una carpeta elegida por el usuario (Storage Access Framework de Android).

**Campos y datos:**
- **Archivo:** `.finanzas` = JSON cifrado con AES-256-GCM, clave derivada de la contraseña con PBKDF2 o argon2.
- **Cabecera sin cifrar:** versión del formato y del esquema.
- **En `settings`:** `last_backup_at`.

**Reglas de negocio:**
- Restaurar **reemplaza** todos los datos actuales (no los mezcla) y lo dice antes.
- Un respaldo de un esquema más nuevo que la app se rechaza ("Actualiza la app para restaurar este respaldo").
- Un respaldo de un esquema más viejo se restaura y luego se le aplican las migraciones.

**Acciones y estados:** aviso en Ajustes si el último respaldo tiene más de 30 días.

**Casos borde y errores:**
- Contraseña incorrecta: "Contraseña incorrecta" sin revelar nada más.
- Archivo dañado: se rechaza sin tocar los datos actuales.
- Contraseña olvidada: el respaldo es irrecuperable, y se avisa al crearlo.

#### Sincronización opcional

**Propósito:** usar la app en dos dispositivos (por ejemplo, el teléfono y la futura versión de PC).

**Funciones:**
- [ ] [Después] Por decidir: es la única función que requiere un servidor (ver [decisiones abiertas](../../Finanzas_SPEC.md#11-riesgos-y-decisiones-abiertas)).
- [ ] [Después] Alternativa sin servidor: sincronizar con un archivo en la nube del usuario (Drive), sin backend propio.

**Campos y datos:**
- `updated_at` y `deleted_at` en cada tabla.
- `device_id` en `settings`.

**Reglas de negocio:**
- Cifrado de extremo a extremo.
- Resolución de conflictos por registro: gana la edición más reciente.
- Un borrado gana sobre una edición anterior.
- Nunca se pierde un registro sin dejar rastro en la auditoría.

**Acciones y estados:** estado visible: "Sincronizado hace 2 min", "Pendiente", "Error".

**Casos borde y errores:**
- Dos dispositivos editan el mismo movimiento sin conexión: gana el más reciente y el otro queda en la auditoría.
- Reloj del teléfono desajustado: usar un contador lógico además de la hora.
