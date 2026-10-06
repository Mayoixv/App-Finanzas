# 6. Metas de ahorro (pestaña "Dinero" › Metas)

[← Índice](../../Finanzas_SPEC.md#0-índice)

### Metas de ahorro

#### Metas

**Propósito:** juntar dinero para algo concreto y ver el avance.

**Funciones:**
- [x] [MVP] Crear meta con nombre y monto objetivo.
- [x] [MVP] Editar nombre y objetivo.
- [x] [MVP] Eliminar, lo que borra también sus aportes, con una advertencia explícita.
- [x] [MVP] Tarjeta por meta con lo juntado, la barra (verde y "Meta cumplida" al llegar) y el botón Aportar.
- [ ] [Después] Archivar metas cumplidas sin borrar sus aportes.

**Campos y datos:**

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| Nombre | texto | Sí | Recortado, no vacío. |
| Objetivo | centavos | Sí | Mayor que 0. |
| Fecha objetivo | `YYYY-MM-DD` | No | [Después] Posterior a hoy. |

**Reglas de negocio:** el progreso cuenta los aportes hasta el final del mes visto, para ver cómo se iba en meses pasados.

**Acciones y estados:**
- Vista "Acumulado" con las metas.
- **Vacío:** "Aún no tienes metas de ahorro".

**Casos borde y errores:**
- Progreso por encima del 100%: la barra se queda en 100% y el texto muestra el % real.
- Eliminar una meta cambia el "ahorrado" de meses pasados; se advierte antes.

#### Aportes

**Propósito:** registrar cada vez que se aparta dinero para una meta.

**Funciones:**
- [x] [MVP] Aportar con monto y fecha (propuesta en el mes visto).
- [x] [MVP] Lista de aportes del mes en la vista "Este mes". Tocar uno pide confirmación para borrarlo.
- [x] [Después] Retirar de una meta (sin pasar de lo ahorrado; resta del ahorrado del mes).
- [ ] [Después] Aporte automático mensual como gasto fijo especial.

**Campos y datos:**

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| Meta | referencia a `savings_goals` | Sí | Debe existir. |
| Monto | centavos | Sí | Mayor que 0. |
| Fecha | `YYYY-MM-DD` | Sí | Fecha válida. |

**Reglas de negocio:**
- El aporte cuenta como "ahorrado" en el mes de su fecha y se resta del balance de ese mes.
- No es un gasto: no aparece en la dona ni en los presupuestos.

**Acciones y estados:**
- Crear y eliminar.
- [ ] [Después] Editar.
- **Vacío del mes:** "Sin aportes en {mes}".

**Casos borde y errores:**
- Meta borrada con el formulario abierto: "Meta de ahorro no encontrada".
- Fecha imposible: "Fecha inválida".

#### Progreso, fecha objetivo y proyección

**Propósito:** saber si al ritmo actual se llega a tiempo.

**Funciones:**
- [x] [MVP] % de avance y lo aportado este mes.
- [x] [Después] Fecha objetivo.
- [x] [Después] Proyección: con el promedio de aportes de los últimos 3 meses, cuándo se llega.
- [x] [Después] Cuánto habría que aportar por mes para llegar a la fecha objetivo.

**Campos y datos:** `target_date` en `savings_goals`. La proyección se calcula.

**Reglas de negocio:** sin aportes en 3 meses no hay proyección ("Aporta para ver cuándo llegas"); nunca se inventa un ritmo.

**Acciones y estados:** la proyección se recalcula con cada aporte.

**Casos borde y errores:** fecha objetivo ya pasada sin cumplir: texto "La fecha objetivo pasó" y opción de cambiarla.
