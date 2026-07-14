/**
 * 示例菜品种子数据
 */
exports.seed = async function(knex) {
  // 清空现有数据
  await knex('dishes').del();
  
  // 插入示例菜品
  await knex('dishes').insert([
    {
      id: 1,
      name: '东坡肉',
      dynasty: '宋朝',
      description: '北宋文学家苏轼所创的红烧肉，色泽红亮，口感酥烂，肥而不腻。苏轼被贬黄州时，因当地猪肉价贱，便创制了这道菜。',
      ingredients: JSON.stringify(['五花肉', '绍兴酒', '酱油', '冰糖', '生姜', '葱']),
      recipe: '1. 五花肉切块，焯水去腥\n2. 锅中放冰糖炒出糖色\n3. 放入肉块翻炒上色\n4. 加入绍兴酒、酱油、生姜\n5. 小火慢炖2小时\n6. 大火收汁即可',
      image_url: '/images/dishes/dongpo-pork.jpg',
      flavor_sour: 0.1,
      flavor_sweet: 0.6,
      flavor_bitter: 0.0,
      flavor_spicy: 0.1,
      flavor_salty: 0.5,
      flavor_umami: 0.8
    },
    {
      id: 2,
      name: '蟹酿橙',
      dynasty: '宋朝',
      description: '南宋林洪《山家清供》中记载的经典名菜。将蟹肉填入橙壳中蒸制，橙香与蟹鲜完美融合，是一道极具文人雅趣的菜品。',
      ingredients: JSON.stringify(['大闸蟹', '甜橙', '醋', '姜末', '菊花瓣']),
      recipe: '1. 大闸蟹蒸熟，取出蟹肉蟹黄\n2. 甜橙去瓤，保留橙壳\n3. 蟹肉与姜末、醋拌匀\n4. 填入橙壳中\n5. 上锅蒸15分钟\n6. 点缀菊花瓣即可',
      image_url: '/images/dishes/crab-orange.jpg',
      flavor_sour: 0.5,
      flavor_sweet: 0.3,
      flavor_bitter: 0.0,
      flavor_spicy: 0.2,
      flavor_salty: 0.3,
      flavor_umami: 0.9
    },
    {
      id: 3,
      name: '太白鸭',
      dynasty: '唐朝',
      description: '相传为唐代诗人李白所创。以鸭肉为主料，配以枸杞、山药等药材，是一道药膳合一的养生佳肴。',
      ingredients: JSON.stringify(['肥鸭', '枸杞', '山药', '红枣', '黄酒', '盐']),
      recipe: '1. 肥鸭洗净，焯水去腥\n2. 枸杞、山药、红枣洗净备用\n3. 鸭肉放入砂锅\n4. 加入药材和黄酒\n5. 大火烧开后转小火炖3小时\n6. 加盐调味即可',
      image_url: '/images/dishes/taibai-duck.jpg',
      flavor_sour: 0.0,
      flavor_sweet: 0.4,
      flavor_bitter: 0.1,
      flavor_spicy: 0.0,
      flavor_salty: 0.4,
      flavor_umami: 0.7
    },
    {
      id: 4,
      name: '贵妃鸡',
      dynasty: '唐朝',
      description: '以杨贵妃命名的宫廷名菜。鸡肉鲜嫩，汤汁浓郁，据传是唐玄宗为杨贵妃所创的御膳。',
      ingredients: JSON.stringify(['母鸡', '香菇', '竹笋', '火腿', '绍酒', '葱姜']),
      recipe: '1. 母鸡洗净，焯水\n2. 香菇、竹笋、火腿切片\n3. 鸡肉放入炖盅\n4. 加入配料和绍酒\n5. 隔水蒸炖2小时\n6. 调味即可上桌',
      image_url: '/images/dishes/concubine-chicken.jpg',
      flavor_sour: 0.0,
      flavor_sweet: 0.3,
      flavor_bitter: 0.0,
      flavor_spicy: 0.1,
      flavor_salty: 0.5,
      flavor_umami: 0.9
    },
    {
      id: 5,
      name: '叫花鸡',
      dynasty: '宋朝',
      description: '源于宋朝乞丐的创意做法。用荷叶包裹鸡肉，外裹黄泥烤制，敲开泥壳后香气四溢，鸡肉鲜嫩多汁。',
      ingredients: JSON.stringify(['嫩鸡', '荷叶', '黄泥', '香菇', '火腿', '虾仁']),
      recipe: '1. 嫩鸡去骨，填入香菇、火腿、虾仁\n2. 用荷叶包裹\n3. 外裹黄泥\n4. 放入烤箱烤制2小时\n5. 敲开泥壳\n6. 拆开荷叶即可食用',
      image_url: '/images/dishes/beggar-chicken.jpg',
      flavor_sour: 0.0,
      flavor_sweet: 0.2,
      flavor_bitter: 0.0,
      flavor_spicy: 0.1,
      flavor_salty: 0.5,
      flavor_umami: 0.8
    }
  ]);
};
