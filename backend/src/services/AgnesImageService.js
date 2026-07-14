const DishVisualPromptService = require('./DishVisualPromptService');
const AiRunMetadata = require('./AiRunMetadata');

class AgnesImageService {
  constructor({
    apiKey = process.env.AGNES_API_KEY,
    baseUrl = process.env.AGNES_BASE_URL || 'https://apihub.agnes-ai.com/v1',
    model = process.env.AGNES_IMAGE_MODEL || 'agnes-image-2.0-flash',
    size = process.env.AGNES_IMAGE_SIZE || '1024x768',
    fetchImpl = global.fetch,
  } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = String(baseUrl || '').replace(/\/$/, '');
    this.model = model;
    this.size = size;
    this.fetchImpl = fetchImpl;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.fetchImpl);
  }

  buildPrompt({ dishName = '历史风味菜品', prompt = '' } = {}) {
    const modelFacingSubject = dishName === '蟹酿橙'
      ? [
          '主体只有一个蒸熟橙盅，白瓷小蒸盏托住完整橙壳容器，橙壳开口露出湿润蟹粉蟹黄蟹肉碎。',
          'steamed orange cup stuffed with crab roe and shredded crab meat, one hollowed orange shell in a small white ceramic steaming bowl.',
          'NO grilled meat, NO fish fillet, NO steak, NO whole crab, NO crab legs, NO crab claws, NO crab shell, NO orange slices as garnish.',
        ].join(' ')
      : '';
    const subject = DishVisualPromptService.buildPrompt({ dishName, prompt });
    return [
      modelFacingSubject,
      subject,
      '看起来必须是一道真实能上桌的菜，有明确主菜、酱汁、配菜和餐盘关系。',
      '只能生成一盘单一成品菜，不能生成双拼、拼贴、概念集合或食材陈列。',
      '所有食材都要是切配、熟制、调味后的可入口状态，动物、水产、果蔬都不能以突兀原始形态出现。',
      '真实中式菜品摄影，端正俯拍或三分之二侧拍，能看清食材和摆盘。',
      '历史风味复原菜，宋元明清器皿质感，自然暖光，干净宣纸色背景。',
      '不要把两个食材或两道菜简单并排拼贴，不要整只动物突兀摆盘。',
      '不要文字，不要水印，不要图标，不要卡通，不要占位符，不要抽象几何。',
    ].join(' ');
  }

  async generate({ dishName = '', prompt = '' } = {}) {
    if (!this.isConfigured()) {
      throw new Error('Agnes image generation is not configured.');
    }

    const startedAt = Date.now();
    const finalPrompt = this.buildPrompt({ dishName, prompt });
    const response = await this.fetchImpl(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt: finalPrompt,
        size: this.size,
        extra_body: {
          response_format: 'url',
        },
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Agnes image generation failed with status ${response.status}: ${message}`);
    }

    const payload = await response.json();
    const image = payload?.data?.[0] || {};
    const imageUrl = image.url || (image.b64_json ? `data:image/png;base64,${image.b64_json}` : '');

    if (!imageUrl) {
      throw new Error('Agnes image generation returned no image URL.');
    }

    return {
      imageUrl,
      type: 'generated',
      status: 'generated',
      provider: 'agnes',
      model: this.model,
      prompt: finalPrompt,
      metadata: AiRunMetadata.generated({
        provider: 'agnes',
        model: this.model,
        startedAt,
      }),
    };
  }
}

module.exports = AgnesImageService;
