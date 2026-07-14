const TeachingService = require('../services/TeachingService');

/**
 * 数字传承人对话式教学
 */
const teach = async (req, res) => {
  try {
    const { dishId, message, sessionId } = req.body;

    // 验证输入
    if (!dishId || !message) {
      return res.status(400).json({
        success: false,
        message: '菜品ID和消息为必填项'
      });
    }

    // 调用教学服务
    const result = await TeachingService.teach({
      dishId,
      message,
      sessionId,
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('教学对话错误:', error);
    res.status(500).json({
      success: false,
      message: '教学过程中出现错误'
    });
  }
};

/**
 * 获取教学历史
 */
const getHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { dishId } = req.query;

    const history = await TeachingService.getHistory(userId, dishId);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('获取教学历史错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

module.exports = {
  teach,
  getHistory
};
