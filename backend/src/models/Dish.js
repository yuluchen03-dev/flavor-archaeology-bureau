const { db } = require('../config/database');

class Dish {
  /**
   * 创建菜品
   */
  static async create(dishData) {
    const [id] = await db('dishes').insert(dishData);
    return this.findById(id);
  }

  /**
   * 根据ID查找菜品
   */
  static async findById(id) {
    const dish = await db('dishes').where({ id }).first();
    if (dish && dish.ingredients) {
      try {
        dish.ingredients = JSON.parse(dish.ingredients);
      } catch (e) {
        // 保持原样
      }
    }
    return dish;
  }

  /**
   * 根据朝代查找菜品
   */
  static async findByDynasty(dynasty) {
    return db('dishes').where({ dynasty });
  }

  /**
   * 搜索菜品
   */
  static async search(keyword) {
    return db('dishes')
      .where('name', 'like', `%${keyword}%`)
      .orWhere('description', 'like', `%${keyword}%`);
  }

  /**
   * 获取所有菜品（分页）
   */
  static async findAll(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    return db('dishes').offset(offset).limit(limit);
  }

  /**
   * 获取味觉星图数据
   */
  static async getFlavorData() {
    const dishes = await db('dishes').select(
      'id', 'name', 'dynasty',
      'flavor_sour', 'flavor_sweet', 'flavor_bitter',
      'flavor_spicy', 'flavor_salty', 'flavor_umami'
    );
    return dishes;
  }

  /**
   * 根据味觉特征查找相似菜品
   */
  static async findSimilar(dishId, limit = 5) {
    const dish = await this.findById(dishId);
    if (!dish) return [];

    // 简单的相似度计算（基于味觉维度的欧氏距离）
    const allDishes = await db('dishes').whereNot({ id: dishId });
    const scored = allDishes.map(d => {
      const distance = Math.sqrt(
        Math.pow(d.flavor_sour - dish.flavor_sour, 2) +
        Math.pow(d.flavor_sweet - dish.flavor_sweet, 2) +
        Math.pow(d.flavor_bitter - dish.flavor_bitter, 2) +
        Math.pow(d.flavor_spicy - dish.flavor_spicy, 2) +
        Math.pow(d.flavor_salty - dish.flavor_salty, 2) +
        Math.pow(d.flavor_umami - dish.flavor_umami, 2)
      );
      return { ...d, similarity: 1 / (1 + distance) };
    });

    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
}

module.exports = Dish;
