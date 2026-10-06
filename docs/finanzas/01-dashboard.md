# 1. Dashboard (pestaña "Inicio")

[← Índice](../../Finanzas_SPEC.md#0-índice)

Pantalla oscura con un solo protagonista: la tarjeta de balance. Desde ella se llega a todo lo del mes.

### Dashboard

#### Resumen del mes

**Propósito:** responder "¿cómo voy este mes?" en un vistazo.

**Funciones:**
- [x] [MVP] Balance del mes = ingresos − gastos − ahorrado, en cifra grande.
- [x] [MVP] Desglose de ingresos, gastos y ahorrado.
- [x] [MVP] % de ahorro del ingreso con su calificación (Excelente ≥ 20%, Regular ≥ 10%, Bajo).
- [x] [MVP] Dona "¿En qué se va el gasto?" con las 5 categorías más grandes y el resto agrupado en "Otras".
- [x] [MVP] Últimos 5 movimientos del mes; tocar uno lo abre para editar.
- [x] [MVP] Tarjeta de presupuestos del mes (ver [Presupuestos](05-presupuestos.md)).
- [x] [MVP] Contador giratorio del balance (design.md, sección 10.5): solo gira lo que cambia y respeta el movimiento reducido.
- [ ] [Después] Comparación con el mes anterior ("+12% de gasto que septiembre").

**Campos y datos:** solo lectura. Usa `transactions` del mes (por rango de fecha), `categories` (para saber si un movimiento es ingreso o gasto) y `savings_contributions` del mes. Montos en centavos.

**Reglas de negocio:**
- Un movimiento cuenta como ingreso si su categoría es de tipo `ingreso`; como gasto si es `fijo` o `variable`.
- Un gasto fijo cuenta solo cuando se marca como pagado (crea el movimiento).
- Sin ingresos no se calcula el %.

**Acciones y estados:**
- Cambiar de mes con flechas o con la cuadrícula de meses.
- Estados:
  - **Vacío:** "Aún no registras movimientos en {mes}" y una invitación a usar +.
  - **Error:** "No se pudieron leer los datos de este mes".
  - **Con datos.**
  - **Balance negativo:** aviso con ícono, no solo en color.

**Casos borde y errores:**
- Un movimiento con una categoría borrada se muestra como "Sin categoría". No puede pasar hoy, porque el borrado se bloquea.
- Si el usuario cambia de mes rápido, una respuesta vieja se descarta (número de carga).
- Montos muy grandes: el número se reduce con `clamp` y parte la línea si hace falta.

#### Patrimonio neto

**Propósito:** saber cuánto se tiene en total: lo que hay en las cuentas menos lo que se debe.

**Funciones:**
- [ ] [Después] Total = suma de saldos de cuentas activas − saldos de tarjetas − deudas pendientes.
- [ ] [Después] Gráfica de línea de los últimos 12 meses (saldo al cierre de cada mes).

**Campos y datos:** depende de [Cuentas](03-cuentas.md), [Tarjetas](09-tarjetas.md) y [Deudas](07-deudas.md). No guarda datos propios: se calcula.

**Reglas de negocio:** las cuentas archivadas no cuentan. Solo se suman cuentas de la moneda de visualización hasta que exista multimoneda real.

**Acciones y estados:**
- Tocar el total lleva al detalle por cuenta.
- **Vacío:** "Agrega tus cuentas para ver tu patrimonio".

**Casos borde y errores:** patrimonio negativo, que se muestra con signo y un aviso con texto, no solo en rojo.

#### Flujo de caja

**Propósito:** ver cuándo entra y sale el dinero dentro del mes, para anticipar días sin efectivo.

**Funciones:**
- [ ] [Después] Barras por semana: entradas contra salidas.
- [ ] [Después] Proyección del resto del mes con los gastos fijos pendientes y sus fechas de vencimiento.

**Campos y datos:** `transactions` del mes e `recurring_instances` pendientes (`due_date`, `amount`).

**Reglas de negocio:** la proyección usa solo datos reales: fijos pendientes, sin estimar gastos variables.

**Acciones y estados:**
- Tocar una barra filtra Movimientos a esa semana.
- **Vacío:** "Sin movimientos este mes".

**Casos borde y errores:** meses con 5 semanas parciales; las semanas se cuentan de lunes a domingo según `es-DO`.

#### Alertas

**Propósito:** avisar dentro de la app de lo que necesita atención este mes.

**Funciones:**
- [x] [MVP] Balance negativo: aviso con ícono en la tarjeta de balance.
- [x] [MVP] Presupuesto pasado o cerca del límite: barra ámbar desde el 85% y roja al pasarse, con texto.
- [x] [MVP] Gastos fijos vencidos o por vencer en 3 días o menos, marcados en ámbar en Fijos.
- [x] [MVP] Fila de alertas en Inicio que reúna las tres: "2 fijos vencen esta semana", "Te pasaste en Ocio".
- [x] [Después] Notificaciones del sistema para estas mismas alertas (ver [Notificaciones](13-notificaciones.md)).

**Campos y datos:** se derivan de presupuestos, instancias de gastos fijos y resumen. No se guardan.

**Reglas de negocio:** una alerta desaparece sola cuando su causa se resuelve (por ejemplo, al pagar el fijo). No hay alertas descartadas a mano en el MVP.

**Acciones y estados:**
- Tocar una alerta navega a la pantalla que la resuelve.
- Sin alertas no se muestra la fila (no hay "Todo bien" de relleno).

**Casos borde y errores:** en meses pasados no se muestran "por vencer", solo los vencidos sin pagar.

#### Accesos rápidos

**Propósito:** hacer lo más frecuente sin navegar.

**Funciones:**
- [x] [MVP] Botón + flotante que crea según la pestaña: movimiento, gasto fijo o meta.
- [x] [MVP] "Ver todos" lleva a Movimientos.
- [x] [MVP] Engranaje que lleva a Ajustes.
- [ ] [Después] Mantener presionado + para elegir "Gasto", "Ingreso" o "Transferencia".

**Campos y datos:** ninguno.

**Reglas de negocio:** el botón + se oculta mientras hay un menú desplegable abierto, para no taparlo.

**Acciones y estados:** un doble toque en + no abre dos formularios.

**Casos borde y errores:** si un formulario se cierra durante el check de éxito, la pantalla se recarga igual.
