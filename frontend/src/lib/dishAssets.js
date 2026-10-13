const APPROVED_DISH_PNG = /^\/dish-backgrounds\/(dish_\d{3})\.png$/i;

export function toRuntimeDishBackground(value) {
  if (typeof value !== 'string') return value;

  const match = value.match(APPROVED_DISH_PNG);
  return match ? `/dish-backgrounds/${match[1].toLowerCase()}.webp` : value;
}
