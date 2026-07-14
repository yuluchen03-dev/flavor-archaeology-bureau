class DigitalHumanService {
  static buildAncestorNarration(input = {}) {
    const safeInput = input && typeof input === 'object' ? input : {};
    const ancestorResult =
      safeInput.ancestorResult && typeof safeInput.ancestorResult === 'object' ? safeInput.ancestorResult : {};
    const fragments = Array.isArray(safeInput.fragments) ? safeInput.fragments : [];
    const ancestor = ancestorResult.ancestor && typeof ancestorResult.ancestor === 'object' ? ancestorResult.ancestor : {};
    const vision = ancestorResult.vision && typeof ancestorResult.vision === 'object' ? ancestorResult.vision : {};
    const dishName = ancestor.name || '这道古味';
    const dynasty = ancestor.dynasty || '未知年代';
    const labels = DigitalHumanService.normalizeLabels(vision.labels);
    const source = ancestor.source_text || fragments.find((fragment) => fragment && fragment.source)?.source || '风味知识库';
    const description = ancestor.description || '档案中仍保留着若隐若现的风味线索。';
    const confidence = DigitalHumanService.resolveConfidence(ancestorResult.confidence, vision.confidence);
    const providerSentence =
      vision.provider === 'external'
        ? '本次视觉判断由外部识别服务提供。'
        : '本次视觉判断使用本地备用线索推理。';
    const visualPhrase = labels.length > 0 ? `可见线索包括 ${labels.join('、')}。` : '可见线索显示出典型的食物外观。';

    return {
      speaker: {
        id: 'taotie-curator',
        name: '饕餮考古官',
        role: '风味证据讲解员',
        avatarTone: 'bronze-mask-curator',
      },
      emotion: 'curious',
      headline: `${dynasty}风味线索：${dishName}`,
      script: [
        providerSentence,
        visualPhrase,
        `古籍来源指向${source}。`,
        `${dishName}的档案描述是：${description}`,
      ].join(''),
      evidenceBullets: [
        `视觉线索：${labels.length > 0 ? labels.join('、') : '典型食物外观'}`,
        `古源线索：${source}`,
        `可信度：${confidence}%`,
      ],
      shareLine: `我在${dynasty}里遇见了${dishName}，证据可信度${confidence}%。`,
    };
  }

  static resolveConfidence(resultConfidence, visionConfidence) {
    const resultPercent = DigitalHumanService.toPercent(resultConfidence);
    if (resultPercent !== null) {
      return resultPercent;
    }

    const visionPercent = DigitalHumanService.toPercent(visionConfidence);
    if (visionPercent !== null) {
      return visionPercent;
    }

    return 70;
  }

  static normalizeLabels(labels) {
    if (!Array.isArray(labels)) {
      return [];
    }

    return labels
      .filter((label) => typeof label === 'string')
      .map((label) => label.trim())
      .filter(Boolean)
      .filter((label, index, normalizedLabels) => normalizedLabels.indexOf(label) === index)
      .slice(0, 4);
  }

  static toPercent(value) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const numericValue = Number(typeof value === 'string' ? value.replace(/%$/, '') : value);
    if (!Number.isFinite(numericValue)) {
      return null;
    }

    const percent = Math.abs(numericValue) <= 1 || (numericValue > 1 && numericValue < 2 && !Number.isInteger(numericValue))
      ? numericValue * 100
      : numericValue;
    return Math.min(100, Math.max(0, Math.round(percent)));
  }
}

module.exports = DigitalHumanService;
