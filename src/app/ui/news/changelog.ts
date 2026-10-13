/**
 * Novedades de cada versión, de la más nueva a la más vieja. Se muestran una vez al abrir la app después de
 * actualizar, y en Ajustes › Novedades. Textos cortos, para quien usa la app (no detalles técnicos).
 * El mismo texto sirve para la descripción del Release en GitHub.
 */
export interface ChangelogEntry {
  version: string;
  points: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0.8',
    points: [
      'Después de cada actualización verás aquí qué cambió. También en Ajustes › Novedades de esta versión.',
      'Arreglos de colores en el modo oscuro: calendario, selectores y hojas de ayuda.',
    ],
  },
  {
    version: '1.0.7',
    points: [
      'Respaldo en la nube: entra con Google en Ajustes › Tus datos y tu respaldo semanal se guarda cifrado en tu cuenta.',
      'Si cambias de teléfono, usa "Restaurar desde la nube" para recuperar tus datos.',
    ],
  },
  {
    version: '1.0.6',
    points: [
      'Modo claro u oscuro: elígelo en Ajustes › Apariencia.',
      'Deudas: con "Pasar la cuota a Fijos", pagar la cuota en Fijos baja el saldo de la deuda.',
    ],
  },
  {
    version: '1.0.5',
    points: ['"Buscar actualización" aparece separado de Privacidad en Ajustes.'],
  },
  {
    version: '1.0.4',
    points: [
      'La app se actualiza sola: te avisa cuando hay una versión nueva.',
      'Los respaldos, el CSV y los PDF se guardan en Documentos/Kuarto del teléfono.',
      'Se quitó la lectura de avisos del banco.',
    ],
  },
];
