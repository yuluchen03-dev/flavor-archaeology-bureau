const Dish = require('../models/Dish');

/**
 * 获取菜品详情
 */
const getRecipe = async (req, res) => {
  try {
    const { id } = req.params;

    const dish = await Dish.findById(id);
    if (!dish) {
      return res.status(404).json({
        success: false,
        message: '菜品不存在'
      });
    }

    // 获取相似菜品
    const similarDishes = await Dish.findSimilar(id, 3);

    res.json({
      success: true,
      data: {
        dish,
        similarDishes
      }
    });
  } catch (error) {
    console.error('获取菜品详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 搜索菜品
 */
const searchRecipes = async (req, res) => {
  try {
    const { keyword, dynasty, page = 1, limit = 10 } = req.query;

    let dishes;
    if (keyword) {
      dishes = await Dish.search(keyword);
    } else if (dynasty) {
      dishes = await Dish.findByDynasty(dynasty);
    } else {
      dishes = await Dish.findAll(page, limit);
    }

    res.json({
      success: true,
      data: dishes
    });
  } catch (error) {
    console.error('搜索菜品错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

module.exports = {
  getRecipe,
  searchRecipes
};
