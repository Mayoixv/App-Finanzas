# 15. Seguridad y cuenta

[← Índice](../../Finanzas_SPEC.md#0-índice)

La app no tiene cuentas en línea. La seguridad es del teléfono hacia adentro. Ver también la [sección 5 del índice](../../Finanzas_SPEC.md#5-seguridad).

### Seguridad y cuenta

#### Bloqueo de la app (PIN y biometría)

**Propósito:** que nadie con el teléfono en la mano vea las finanzas.

**Funciones:**
- [ ] [MVP] Activar un PIN de 4 a 6 dígitos.
- [ ] [MVP] Desbloqueo con huella o rostro (biometría de Android), con el PIN como respaldo.
- [ ] [MVP] Bloquear al abrir y al volver de segundo plano tras 1 minuto (configurable: inmediato, 1, 5 o 15 minutos).
- [ ] [MVP] Ocultar el contenido en la vista de apps recientes e impedir capturas (`FLAG_SECURE`), con un interruptor.

**Campos y datos:**
- En `settings`: `pin_hash` y `pin_salt` (PBKDF2-SHA256, 310,000 iteraciones, o argon2id), `biometric_enabled`, `lock_after_seconds` y `secure_screen`.
- El PIN nunca se guarda en claro.

**Reglas de negocio:**
- Tras 5 intentos fallidos se espera 30 s, y el tiempo se duplica en cada fallo siguiente (máximo 15 min).
- Cambiar o quitar el PIN pide el PIN actual.

**Acciones y estados:** activar, cambiar y quitar el PIN; activar la biometría solo si el teléfono la tiene configurada.

**Casos borde y errores:**
- **PIN olvidado:** no hay recuperación en línea. La única salida es borrar los datos y restaurar un respaldo. Se avisa al activarlo.
- **Biometría eliminada del sistema:** se vuelve al PIN.

#### Borrar todos los datos

**Propósito:** empezar de cero o entregar el teléfono sin dejar rastro.

**Funciones:**
- [ ] [MVP] "Borrar todos los datos" con doble confirmación (escribir "BORRAR").
- [ ] [MVP] Ofrecer exportar antes de borrar.

**Campos y datos:** borra el archivo de la base de datos y las preferencias, y recrea la base con las migraciones (vuelven las categorías por defecto).

**Reglas de negocio:** no se puede deshacer. Si hay PIN, se pide antes.

**Acciones y estados:** al terminar, la app abre el onboarding.

**Casos borde y errores:** falla a mitad: al reabrir, si la base está incompleta, se recrea desde cero.

#### Cuenta en línea (contraseña, 2FA, sesiones)

**Propósito:** solo si se aprueba la [sincronización](16-respaldos.md#sincronización-opcional).

**Funciones:**
- [ ] [Después] **No aplica mientras la app sea 100% local.** Si llega la sincronización, se requerirá:
  - contraseña con hash argon2id en el servidor;
  - 2FA opcional con TOTP;
  - lista de sesiones activas con revocación;
  - historial de accesos;
  - eliminar la cuenta y todos los datos del servidor.

**Campos y datos:** a definir con el backend.

**Reglas de negocio:** los datos viajarían cifrados de extremo a extremo, de modo que el servidor no pueda leer montos ni notas.

**Acciones y estados:** a definir.

**Casos borde y errores:** a definir.
