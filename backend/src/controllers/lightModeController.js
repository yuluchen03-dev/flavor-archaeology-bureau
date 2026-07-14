const LightModeService = require('../services/LightModeService');
const ShareIntentService = require('../services/ShareIntentService');

const recognizeAncestor = async (req, res) => {
  try {
    const result = await LightModeService.recognizeAncestor({
      ...(req.body || {}),
      userId: req.user?.id,
    });

    res.json({
      success: true,
      message: '拍照认祖完成',
      data: result,
    });
  } catch (error) {
    console.error('拍照认祖错误:', error);
    res.status(500).json({
      success: false,
      message: '拍照认祖过程中出现错误',
    });
  }
};

const getDailyRevival = async (req, res) => {
  try {
    const result = await LightModeService.getDailyRevival({
      date: req.query.date,
      seed: req.query.seed,
      draw: req.query.draw === '1' || req.query.draw === 'true',
      excludeDishId: req.query.excludeDishId,
      userId: req.user?.id,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('每日复活错误:', error);
    res.status(500).json({
      success: false,
      message: '每日复活过程中出现错误',
    });
  }
};

const getAuthenticityRound = async (req, res) => {
  try {
    const result = await LightModeService.getAuthenticityRound({
      seed: req.query.seed,
      dynasty: req.query.dynasty,
      difficulty: req.query.difficulty,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('真假非遗错误:', error);
    res.status(500).json({
      success: false,
      message: '真假非遗题目生成失败',
    });
  }
};

const createShareCard = async (req, res) => {
  try {
    const result = await LightModeService.createShareCard({
      ...(req.body || {}),
      userId: req.user?.id,
    });
    await ShareIntentService.recordPreparedShareIntents({
      userId: req.user?.id,
      card: result,
    });

    res.json({
      success: true,
      message: '分享卡生成完成',
      data: result,
    });
  } catch (error) {
    console.error('分享卡生成错误:', error);
    res.status(500).json({
      success: false,
      message: '分享卡生成失败',
    });
  }
};

module.exports = {
  recognizeAncestor,
  getDailyRevival,
  getAuthenticityRound,
  createShareCard,
};
