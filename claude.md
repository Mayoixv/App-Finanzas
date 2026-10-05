# Finanzas Personales

App móvil (APK) de finanzas personales, 100% local, registro completo por mes. Luego se extiende a PC.

## Stack
Ionic + Angular (standalone) + Capacitor. Datos en SQLite en el dispositivo
(@capacitor-community/sqlite). Sin backend. UI en español, moneda por defecto DOP.

## Arquitectura (Clean Architecture + Repositorio)
src/app/
  domain/          entidades y reglas puras, sin imports de Angular ni SQLite
  application/     casos de uso, DTOs e interfaces de repositorio (ITransactionRepository...)
  infrastructure/  repositorios SQLite, esquema y migraciones
  ui/              páginas y componentes Ionic
Las dependencias apuntan hacia adentro: ui -> application -> domain.
infrastructure implementa las interfaces de application.

## Modelo
El mes es un filtro por fecha, no una copia de datos.
Los montos se guardan y se calculan en centavos enteros (RD$12.50 = 1250); solo la UI los convierte al mostrar y al leer campos.
La moneda (DOP o USD) se elige en Ajustes y solo cambia el símbolo: no convierte montos.
Entidades: Category (tipo: ingreso | fijo | variable), Transaction (fecha, monto, categoría, nota),
RecurringExpense (plantilla de gasto fijo con día de vencimiento; cada mes genera su instancia Pagado/Pendiente),
SavingsGoal, SavingsContribution, Budget (límite por categoría y mes).
Resumen mensual: balance = ingresos - gastos - ahorrado; % ahorro = ahorrado / ingresos (>=20% excelente, >=10% regular).

## Reglas
- Todo cambio de esquema va como migración, nunca editar tablas a mano.
- Commits pequeños; probar con `ionic serve` antes de cada commit.
- Textos de la interfaz en español, sin relleno ni cifras inventadas.