# Kuarto

App de finanzas personales para Android. Anotas lo que entra y lo que sale cada mes, tus pagos fijos, tus cuentas y tarjetas, tus metas y tus deudas, y ves cómo vas.

Todo se guarda solo en tu teléfono: no hay cuentas, servidores ni publicidad.

## Qué hace

- **Inicio:** balance del mes (ingresos − gastos − ahorrado), porcentaje de ahorro, alertas y patrimonio.
- **Movimientos:** ingresos y gastos con categoría, cuenta, nota y fecha. Búsqueda y filtros.
- **Fijos:** sueldo, alquiler, servicios y suscripciones que se repiten cada mes, con su estado (pagado, pendiente, vencido) y las cuotas de las deudas.
- **Dinero:** cuentas de banco, efectivo y tarjetas de crédito, con su saldo. Transferencias y pago de tarjeta sin contarlos como gasto. Corte, fecha de pago y uso del límite de cada tarjeta.
- **Planes:** metas de ahorro con aportes desde una cuenta, y deudas (lo que debes o te deben) con calendario de cuotas.
- **Reportes:** meses comparados, gasto por categoría y exportación del mes a PDF.
- **Presupuestos** por categoría, **avisos** de pagos próximos, **PIN y huella**, y **respaldos cifrados** (manuales o automáticos cada semana).
- Moneda en pesos dominicanos (RD$) o dólares (US$). Solo cambia el símbolo, no convierte montos.

## Instalar

1. Descarga el último `Kuarto-X.Y.Z.apk` desde [Releases](https://github.com/Mayoixv/App-Finanzas/releases/latest).
2. Ábrelo en el teléfono y permite instalar apps de esa fuente cuando Android lo pida.
3. Si Play Protect avisa, toca **Más detalles › Instalar de todas formas**. La app no está en la Play Store, por eso avisa.

Requiere Android 7.0 o más nuevo.

### Actualizaciones

La app revisa una vez al día si hay una versión nueva en Releases (también en **Ajustes › Buscar actualización**). Si la hay, la descarga y Android muestra **Instalar**. Tus datos se quedan como están.

Para revisar solo lee la lista de versiones de GitHub: no envía ningún dato tuyo.

## Tus datos

- Viven en una base SQLite dentro del teléfono.
- **Ajustes › Tus datos › Crear respaldo** guarda un archivo cifrado con tu contraseña en `Documentos/Kuarto`. Cópialo fuera del teléfono (Drive, correo).
- Para pasar tus datos a otro teléfono: instala Kuarto y usa **Restaurar respaldo** con ese archivo.
- Si borras la app sin un respaldo, tus datos se pierden: nadie más tiene una copia.

## Desarrollo

Hecha con Ionic + Angular (componentes standalone) y Capacitor, con los datos en SQLite (`@capacitor-community/sqlite`).

```
src/app/
  domain/          entidades y reglas puras (montos en centavos enteros)
  application/     casos de uso e interfaces de repositorio
  infrastructure/  repositorios SQLite y migraciones
  ui/              pantallas y componentes
```

Las dependencias apuntan hacia adentro: `ui → application → domain`. Cada cambio de esquema es una migración nueva en `infrastructure/sqlite/migrations.ts`.

Necesitas Node 22.5 o más nuevo (las pruebas usan `node:sqlite`) y, para Android, JDK 21 y el SDK de Android.

```bash
npm install
npm start            # la app en el navegador, en http://localhost:4200
npm test             # pruebas
npm run lint
```

APK de prueba:

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

### Publicar una versión

1. Sube el número en `src/app/version.ts` y `versionCode` / `versionName` en `android/app/build.gradle`.
2. Compila con `./gradlew assembleRelease`. La firma se lee de `../../firma/keystore.properties`, fuera del repositorio; sin ese archivo el APK sale sin firmar.
3. Crea un Release en GitHub con la etiqueta `vX.Y.Z` y adjunta el APK como `Kuarto-X.Y.Z.apk`.

Todas las versiones deben firmarse con la misma llave: Android no instala una actualización firmada con otra.
