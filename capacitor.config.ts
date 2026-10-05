import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mayoixv.finanzas',
  appName: 'Finanzas',
  webDir: 'www',
  plugins: {
    CapacitorSQLite: {
      // La base no usa contraseña. Con esto en true (su valor por defecto) el plugin abre al arrancar unas
      // preferencias cifradas con una llave del teléfono; si Android las restaura de una copia de seguridad la
      // llave ya no coincide y el plugin no carga ("CapacitorSQLitePlugin: null").
      androidIsEncryption: false,
    },
  },
};

export default config;
