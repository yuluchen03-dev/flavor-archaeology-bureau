class OpenAIVisionProvider {
  constructor({
    apiKey = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini',
    fetchImpl = global.fetch,
  } = {}) {
    this.apiKey = apiKey;
    this.model = model;
    this.fetchImpl = fetchImpl;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.fetchImpl);
  }

  buildPrompt({ imageLabel = '', description = '' } = {}) {
    return [
      '你是一个中文饮食考古视觉模型。请分析食物图片中的形态、食材、器皿、烹饪线索和历史菜品可能性。',
      '只返回严格 JSON，不要使用 Markdown，不要添加解释性文字。',
      'JSON 必须包含这些键：labels, ingredients, dishCandidates, confidence, evidence。',
      'labels、ingredients、dishCandidates、evidence 应为数组；confidence 应为 0 到 1 的数字。',
      `imageLabel: ${imageLabel}`,
      `description: ${description}`,
    ].join('\n');
  }

  async analyze({ imageData = '', imageLabel = '', description = '' } = {}) {
    if (!this.isConfigured()) {
      throw new Error('External VLM provider is not configured.');
    }

    if (!imageData || !String(imageData).startsWith('data:image/')) {
      throw new Error('External VLM requires an image data URL.');
    }

    const response = await this.fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: this.buildPrompt({ imageLabel, description }),
              },
              {
                type: 'input_image',
                image_url: imageData,
              },
            ],
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`External VLM request failed with status ${response.status}.`);
    }

    const payload = await response.json();
    const contentText = this.extractContentText(payload);
    let parsed;

    try {
      parsed = JSON.parse(contentText);
    } catch (error) {
      throw new Error('External VLM returned malformed JSON.');
    }

    if (!this.isValidProviderShape(parsed)) {
      throw new Error('External VLM returned invalid JSON shape.');
    }

    return {
      provider: 'external',
      model: this.model,
      labels: parsed.labels.filter(Boolean),
      ingredients: parsed.ingredients.filter(Boolean),
      dishCandidates: parsed.dishCandidates.filter(Boolean),
      confidence: this.clampConfidence(parsed.confidence),
      evidence: parsed.evidence.filter(Boolean),
      rawProvider: {
        requestId: response.headers?.get?.('x-request-id') || response.headers?.get?.('openai-request-id') || null,
      },
    };
  }

  extractContentText(payload = {}) {
    if (payload.output_text) {
      return payload.output_text;
    }

    const output = Array.isArray(payload.output) ? payload.output : [];
    for (const item of output) {
      const content = Array.isArray(item.content) ? item.content : [];
      const textContent = content.find((entry) => entry && typeof entry.text === 'string');
      if (textContent) {
        return textContent.text;
      }
    }

    return '';
  }

  isValidProviderShape(parsed) {
    return (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      Array.isArray(parsed.labels) &&
      Array.isArray(parsed.ingredients) &&
      Array.isArray(parsed.dishCandidates) &&
      Array.isArray(parsed.evidence) &&
      typeof parsed.confidence === 'number' &&
      Number.isFinite(parsed.confidence)
    );
  }

  clampConfidence(confidence) {
    return Math.min(1, Math.max(0, confidence));
  }
}

module.exports = OpenAIVisionProvider;
