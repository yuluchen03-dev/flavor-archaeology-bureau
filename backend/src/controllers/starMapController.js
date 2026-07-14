const StarMapService = require('../services/StarMapService');

/**
 * 获取味觉星图数据
 */
const getStarMap = async (req, res) => {
  try {
    const { dynasty, flavorRange } = req.query;

    const starMapData = await StarMapService.getStarMapData({
      dynasty,
      flavorRange
    });

    res.json({
      success: true,
      data: starMapData
    });
  } catch (error) {
    console.error('获取星图数据错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

/**
 * 获取菜品在星图上的位置
 */
const getDishPosition = async (req, res) => {
  try {
    const { id } = req.params;

    const position = await StarMapService.getDishPosition(id);

    if (!position) {
      return res.status(404).json({
        success: false,
        message: '菜品不存在'
      });
    }

    res.json({
      success: true,
      data: position
    });
  } catch (error) {
    console.error('获取菜品位置错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

module.exports = {
  getStarMap,
  getDishPosition
};
