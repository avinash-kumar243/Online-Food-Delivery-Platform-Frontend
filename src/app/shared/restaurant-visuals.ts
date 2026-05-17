import { Restaurant } from '../models/app.models';

const RESTAURANT_IMAGE_MAP: Record<string, string> = {
  'BAPU KI KUTIA': 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1400&q=80',
  'BABU KE KUTIYA': 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1400&q=80',
  'GOLDEN PANDA BISTRO': 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=2400&q=80',
  'TAJ RESTAURANT': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
  'MUKESH RESTAURANT': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80'
};

function normalizeRestaurantName(name: string | null | undefined): string {
  return (name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export function getCustomerRestaurantImage(restaurant: Pick<Restaurant, 'name' | 'imageUrl'>): string | null {
  const mappedImage = RESTAURANT_IMAGE_MAP[normalizeRestaurantName(restaurant.name)];
  if (mappedImage) {
    return mappedImage;
  }

  const existingImage = restaurant.imageUrl?.trim();
  if (existingImage) {
    return existingImage;
  }

  return null;
}
