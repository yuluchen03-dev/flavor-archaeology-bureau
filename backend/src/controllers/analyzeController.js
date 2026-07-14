const AnalysisService = require('../services/AnalysisService');

/**
 * 分析古籍/古画/口述线索
 */
const analyze = async (req, res) => {
  try {
    const { inputType, content, imageUrl } = req.body;

    // 验证输入
    if (!inputType || !content) {
      return res.status(400).json({
        success: false,
        message: '输入类型和内容为必填项'
      });
    }

    // 调用分析服务
    const result = await AnalysisService.analyze({
      inputType,
      content,
      imageUrl,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: '分析完成',
      data: result
    });
  } catch (error) {
    console.error('分析错误:', error);
    res.status(500).json({
      success: false,
      message: '分析过程中出现错误'
    });
  }
};

/**
 * 获取分析历史记录
 */
const getHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 10 } = req.query;

    const records = await AnalysisService.getUserHistory(userId, page, limit);

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('获取历史记录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

module.exports = {
  analyze,
  getHistory
};
