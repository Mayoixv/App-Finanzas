import { isNewer, releaseVersion } from './update.service';

describe('isNewer', () => {
  it('compara las versiones por número, no como texto', () => {
    expect(isNewer('1.0.3', '1.0.2')).toBe(true);
    expect(isNewer('1.0.10', '1.0.9')).toBe(true);
    expect(isNewer('1.1', '1.0.9')).toBe(true);
    expect(isNewer('1.0.2', '1.0.2')).toBe(false);
    expect(isNewer('1.0.1', '1.0.2')).toBe(false);
  });
});

describe('releaseVersion', () => {
  it('saca el número del nombre del APK o de la etiqueta', () => {
    expect(releaseVersion('Kuarto-1.0.5.apk')).toBe('1.0.5');
    expect(releaseVersion('v1.0.5')).toBe('1.0.5');
    expect(releaseVersion('Kuarto')).toBeNull();
  });
});
