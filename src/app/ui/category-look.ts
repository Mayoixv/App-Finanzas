import { addIcons } from 'ionicons';
import {
  airplaneOutline,
  bedOutline,
  briefcaseOutline,
  busOutline,
  cardOutline,
  carOutline,
  cartOutline,
  cashOutline,
  constructOutline,
  fitnessOutline,
  flashOutline,
  gameControllerOutline,
  giftOutline,
  heartOutline,
  homeOutline,
  medkitOutline,
  pawOutline,
  phonePortraitOutline,
  playCircleOutline,
  pricetagOutline,
  restaurantOutline,
  schoolOutline,
  shieldCheckmarkOutline,
  shirtOutline,
  tvOutline,
  walletOutline,
  waterOutline,
  wifiOutline,
} from 'ionicons/icons';
import { Category } from '../domain/category';

const ICONS = {
  'restaurant-outline': restaurantOutline,
  'cart-outline': cartOutline,
  'car-outline': carOutline,
  'bus-outline': busOutline,
  'airplane-outline': airplaneOutline,
  'home-outline': homeOutline,
  'bed-outline': bedOutline,
  'flash-outline': flashOutline,
  'water-outline': waterOutline,
  'wifi-outline': wifiOutline,
  'phone-portrait-outline': phonePortraitOutline,
  'tv-outline': tvOutline,
  'play-circle-outline': playCircleOutline,
  'medkit-outline': medkitOutline,
  'fitness-outline': fitnessOutline,
  'school-outline': schoolOutline,
  'shirt-outline': shirtOutline,
  'gift-outline': giftOutline,
  'paw-outline': pawOutline,
  'game-controller-outline': gameControllerOutline,
  'heart-outline': heartOutline,
  'card-outline': cardOutline,
  'cash-outline': cashOutline,
  'wallet-outline': walletOutline,
  'briefcase-outline': briefcaseOutline,
  'construct-outline': constructOutline,
  'shield-checkmark-outline': shieldCheckmarkOutline,
  'pricetag-outline': pricetagOutline,
};
addIcons(ICONS);

export const CATEGORY_ICONS = Object.keys(ICONS);

/** Para lectores de pantalla. */
export const ICON_LABEL: Record<string, string> = {
  'restaurant-outline': 'Comida',
  'cart-outline': 'Carrito',
  'car-outline': 'Carro',
  'bus-outline': 'Autobús',
  'airplane-outline': 'Avión',
  'home-outline': 'Casa',
  'bed-outline': 'Cama',
  'flash-outline': 'Rayo',
  'water-outline': 'Agua',
  'wifi-outline': 'Wifi',
  'phone-portrait-outline': 'Teléfono',
  'tv-outline': 'Televisor',
  'play-circle-outline': 'Reproducir',
  'medkit-outline': 'Botiquín',
  'fitness-outline': 'Gimnasio',
  'school-outline': 'Escuela',
  'shirt-outline': 'Ropa',
  'gift-outline': 'Regalo',
  'paw-outline': 'Mascota',
  'game-controller-outline': 'Juegos',
  'heart-outline': 'Corazón',
  'card-outline': 'Tarjeta',
  'cash-outline': 'Billetes',
  'wallet-outline': 'Billetera',
  'briefcase-outline': 'Maletín',
  'construct-outline': 'Herramientas',
  'shield-checkmark-outline': 'Escudo',
  'pricetag-outline': 'Etiqueta',
};

/** Tonos con texto blanco encima a 4.5:1 o más, para el ícono dentro del círculo. */
export const CATEGORY_COLORS = ['#6639ec', '#2563eb', '#0e7490', '#0f8a5f', '#a16207', '#c2410c', '#b91c1c', '#be185d', '#475569'];

/** Ícono y color con los que se dibuja una categoría; las que no tienen se ven con el de su tipo. */
export function lookOf(c: Pick<Category, 'type' | 'icon' | 'color'>): { icon: string; color: string } {
  return {
    icon: c.icon && c.icon in ICONS ? c.icon : 'pricetag-outline',
    color: c.color ?? (c.type === 'ingreso' ? '#0f8a5f' : '#6639ec'),
  };
}
