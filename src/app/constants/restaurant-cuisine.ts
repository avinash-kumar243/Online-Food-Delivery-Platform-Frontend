export const RESTAURANT_CUISINES = [
  'Indian',
  'Chinese',
  'Snacks',
  'Italian',
  'South Indian',
  'Fast Food'
] as const;

export const CUISINE_CATEGORY_MAP: Record<string, string[]> = {
  Indian: [
    'STARTERS',
    'MAIN_COURSE',
    'RICE_AND_BIRYANI',
    'BREADS',
    'SNACKS',
    'DESSERTS',
    'BEVERAGES'
  ],
  Chinese: [
    'STARTERS',
    'NOODLES',
    'RICE',
    'MAIN_COURSE',
    'MOMOS',
    'SOUPS'
  ],
  Italian: [
    'PIZZA',
    'PASTA',
    'GARLIC_BREAD',
    'MAIN_COURSE',
    'DESSERTS',
    'BEVERAGES'
  ],
  'South Indian': [
    'DOSA',
    'IDLI_AND_VADA',
    'RICE_ITEMS',
    'SNACKS',
    'COMBO_MEALS',
    'BEVERAGES'
  ],
  'Fast Food': [
    'BURGER',
    'PIZZA',
    'SANDWICH',
    'WRAPS',
    'FRIES',
    'COMBO_MEALS',
    'BEVERAGES'
  ],
  Snacks: [
    'STREET_SNACKS',
    'CHAAT_ITEMS',
    'FRIED_SNACKS',
    'ROLLS_AND_WRAPS',
    'MOMOS_AND_DUMPLINGS',
    'SANDWICHES',
    'QUICK_BITES',
    'TEA_TIME_SNACKS'
  ],
  DESSERTS_AND_BEVERAGES: [
    'CAKES',
    'ICE_CREAMS',
    'INDIAN_SWEETS',
    'SHAKES',
    'JUICES',
    'HOT_BEVERAGES',
    'COLD_BEVERAGES'
  ]
};

export function getCuisineCategories(cuisine?: string | null): string[] {
  if (!cuisine) {
    return [];
  }

  return CUISINE_CATEGORY_MAP[cuisine] ?? [];
}

export function formatCategoryLabel(category: string): string {
  return category
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}
