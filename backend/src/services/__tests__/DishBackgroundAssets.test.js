const fs = require('fs');
const path = require('path');
const StarMapService = require('../StarMapService');

const dishes = require(path.join(__dirname, '../../../../data/knowledge_graph/nodes_dish.json'));
const manifestPath = path.join(__dirname, '../../../../data/visual_assets/dish_backgrounds.json');
const publicDir = path.join(__dirname, '../../../../frontend/public');

describe('dish background image assets', () => {
  test('every knowledge graph dish has a local Agnes background image manifest entry', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const entriesByDish = new Map(manifest.images.map((entry) => [entry.dishId, entry]));

    expect(manifest.images).toHaveLength(dishes.length);
    expect(manifest.images).toHaveLength(40);

    for (const dish of dishes) {
      const entry = entriesByDish.get(dish.id);
      expect(entry).toEqual(expect.objectContaining({
        dishId: dish.id,
        dishName: dish.name,
        provider: 'agnes',
        model: expect.any(String),
        imagePath: expect.stringMatching(/^\/dish-backgrounds\/dish_\d{3}\.(png|jpg|jpeg|webp)$/),
        prompt: expect.stringContaining(dish.name),
        qaStatus: 'approved',
      }));

      const assetPath = path.join(publicDir, entry.imagePath.replace(/^\//, ''));
      expect(fs.existsSync(assetPath)).toBe(true);
      // Minimum size of 35KB reflects acceptable WebP compression for background images.
      expect(fs.statSync(assetPath).size).toBeGreaterThan(35 * 1024);
    }
  });

  test('star map points expose the local background image path for each dish', async () => {
    const starMap = await StarMapService.getStarMapData({});

    expect(starMap.points).toHaveLength(40);
    for (const point of starMap.points) {
      expect(point.backgroundImage).toMatch(/^\/dish-backgrounds\/dish_\d{3}\.(png|jpg|jpeg|webp)$/);
    }
  });
});
