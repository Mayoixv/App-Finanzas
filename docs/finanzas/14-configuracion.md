# 14. Configuración (pantalla "Ajustes")

[← Índice](../../Finanzas_SPEC.md#0-índice)

Pantalla clara fuera de las pestañas, a la que se entra desde el engranaje de Inicio. Las categorías también viven aquí (ver [Categorías](04-categorias.md)).

### Configuración

#### Moneda y formato regional

**Propósito:** que los montos se vean con el símbolo correcto.

**Funciones:**
- [x] [MVP] Moneda: Peso dominicano (RD$) o Dólar estadounidense (US$), con menú desplegable.
- [x] [MVP] El cambio aplica al instante en toda la app y se guarda en el teléfono.
- [x] [MVP] Formato `es-DO`: `RD$1,250.50`, fechas como "5 oct".
- [ ] [Después] Primer día de la semana (para el flujo de caja).

**Campos y datos:** `settings.currency` = `DOP` o `USD`. Un valor desconocido vuelve a `DOP`.

**Reglas de negocio:** cambiar la moneda **no convierte** montos, solo cambia el símbolo. La pantalla lo dice.

**Acciones y estados:** el desplegable se cierra al elegir, al tocar fuera, con Escape o con el botón atrás.

**Casos borde y errores:** falla al guardar: el mensaje "No se pudo cambiar la moneda" y la moneda anterior se mantiene.

#### Tema, idioma y preferencias

**Propósito:** ajustar la app al gusto del usuario.

**Funciones:**
- [ ] [Después] Tema: hoy cada pantalla tiene su superficie fija (Inicio y Fijos oscuras; Movimientos, Ahorro y Ajustes claras), según design.md. Un tema totalmente oscuro o claro requiere decisión de diseño.
- [ ] [Después] Idioma: solo español. Preparar los textos para inglés.
- [ ] [Después] Pantalla de inicio por defecto (Inicio o Movimientos).

**Campos y datos:** `settings.theme`, `settings.language`, `settings.start_tab`.

**Reglas de negocio:** todo tema que se ofrezca debe cumplir contraste AA en todas las pantallas.

**Acciones y estados:** aplicar sin reiniciar la app.

**Casos borde y errores:** el sistema pide reducir el movimiento: se respeta siempre, sin opción para desactivarlo.

#### Perfil

**Propósito:** datos mínimos para personalizar los textos.

**Funciones:**
- [ ] [Después] Nombre para el saludo ("Hola, {nombre}").
- [ ] [Después] Día de cobro habitual, para sugerir el ingreso del mes.

**Campos y datos:** `settings.profile_name` (texto opcional, 40 caracteres como máximo) y `settings.payday` (1-31, opcional).

**Reglas de negocio:** sin correo, teléfono ni cuenta en línea. Todo es opcional.

**Acciones y estados:** editar y borrar.

**Casos borde y errores:** nombre vacío: no hay saludo, nunca "Hola, usuario".
