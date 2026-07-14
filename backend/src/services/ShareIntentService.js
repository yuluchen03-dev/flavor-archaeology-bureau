const { db } = require('../config/database');

function compact(values) {
  return values.filter(Boolean);
}

class ShareIntentService {
  static buildPlatformIntents(card = {}) {
    const hashtags = compact([
      '风味考古局',
      '非遗美食',
      card.dynasty,
      card.rarity,
      card.dishName,
    ]);
    const baseCopy = compact([
      card.shareText || card.title,
      card.subtitle,
      card.certificateId ? `证书编号：${card.certificateId}` : '',
      `#${hashtags.join(' #')}`,
    ]).join('\n');

    return {
      xiaohongshu: {
        title: card.title || '风味复活证书',
        body: baseCopy,
        hashtags,
        copyText: baseCopy,
        publishUrl: 'https://www.xiaohongshu.com/explore',
        canAutoPublish: false,
        reason: 'Requires user account authorization on platform.',
      },
      douyin: {
        title: card.title || '风味复活证书',
        body: baseCopy,
        hashtags,
        copyText: baseCopy,
        publishUrl: 'https://www.douyin.com/',
        canAutoPublish: false,
        reason: 'Requires user account authorization on platform.',
      },
    };
  }

  static async recordPreparedShareIntents({ userId, card = {} } = {}) {
    if (!userId || !card.platformIntents) {
      return [];
    }

    const records = [];
    for (const [platform, intent] of Object.entries(card.platformIntents)) {
      const [id] = await db('share_records').insert({
        user_id: userId,
        platform,
        status: 'prepared',
        card_payload: JSON.stringify(card),
        copy_text: intent.copyText || intent.body || card.shareText || card.title || '',
      });

      records.push({
        id,
        platform,
        status: 'prepared',
      });
    }

    return records;
  }
}

module.exports = ShareIntentService;
