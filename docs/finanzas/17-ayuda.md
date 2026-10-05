# 17. Ayuda y soporte

[← Índice](../../Finanzas_SPEC.md#0-índice)

### Ayuda y soporte

#### Onboarding

**Propósito:** que la primera apertura deje la app lista para usar en menos de un minuto.

**Funciones:**
- [x] [MVP] Pantalla de bienvenida: qué hace la app y que todo se guarda solo en el teléfono.
- [x] [MVP] Elegir moneda (obligatorio).
- [x] [MVP] Ingreso del mes y gastos fijos principales (opcionales, con "Lo hago después").
- [ ] [Después] Activar PIN y recordatorios.

**Campos y datos:** `settings.onboarding_done` (0/1). Reusa los formularios existentes.

**Reglas de negocio:** se muestra una sola vez y no se vuelve a mostrar tras actualizar la app.

**Acciones y estados:** "Atrás", "Siguiente" y "Saltar" en cada paso opcional.

**Casos borde y errores:** la app se cierra a mitad del onboarding: se retoma en el paso donde iba.

#### Preguntas frecuentes y tutoriales

**Propósito:** resolver dudas sin salir de la app.

**Funciones:**
- [ ] [Después] Preguntas frecuentes con respuestas reales de la app. Por ejemplo:
  - ¿Por qué mi sueldo aparece en el mes anterior? Por la fecha del movimiento.
  - ¿Cambiar la moneda convierte mis montos? No.
  - ¿Qué pasa si borro un pago de un gasto fijo?
  - ¿Dónde se guardan mis datos?
- [ ] [Después] Consejos breves la primera vez que se abre cada pantalla, que se pueden cerrar y no vuelven.

**Campos y datos:** texto empaquetado en la app (funciona sin conexión). `settings.tips_seen` (lista).

**Reglas de negocio:** solo preguntas que los usuarios hagan de verdad; nada de preguntas de relleno.

**Acciones y estados:** buscar en las preguntas.

**Casos borde y errores:** ninguno relevante: es contenido estático.

#### Reportar un problema

**Propósito:** que el usuario pueda avisar de un error sin exponer sus datos.

**Funciones:**
- [ ] [Después] "Reportar un problema" abre el correo con versión de la app, de Android y del esquema ya escritas.
- [ ] [Después] Adjuntar opcionalmente un registro técnico sin montos, notas ni nombres.

**Campos y datos:** correo de soporte por definir (ver la [sección 12](../../Finanzas_SPEC.md#12-qué-se-agregó-y-qué-faltó)).

**Reglas de negocio:** nunca adjuntar la base de datos ni exportaciones automáticamente.

**Acciones y estados:** el usuario revisa el texto antes de enviarlo.

**Casos borde y errores:** el teléfono sin app de correo: copiar el texto al portapapeles.
