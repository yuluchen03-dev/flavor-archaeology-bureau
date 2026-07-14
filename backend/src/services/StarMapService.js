const fs = require('fs');
const path = require('path');
const PythonBridge = require('./PythonBridge');

const backgroundManifestPath = path.join(__dirname, '../../../data/visual_assets/dish_backgrounds.json');

function loadDishBackgrounds() {
  if (!fs.existsSync(backgroundManifestPath)) return new Map();

  try {
    const manifest = JSON.parse(fs.readFileSync(backgroundManifestPath, 'utf8'));
    return new Map((manifest.images || [])
      .filter((entry) => entry.qaStatus === 'approved' && entry.imagePath)
      .map((entry) => [entry.dishId, entry]));
  } catch {
    return new Map();
  }
}

/**
 * 星图服务 - 调用Python引擎获取真实知识图谱数据
 */
class StarMapService {
  /**
   * 获取星图数据
   */
  static async getStarMapData({ dynasty, flavorRange }) {
    // 从Python引擎获取真实数据
    const starMapData = await PythonBridge.getStarMap();
    
    let dishes = starMapData.dishes || [];
    let connections = starMapData.connections || [];
    const backgroundByDishId = loadDishBackgrounds();

    // 按朝代筛选
    if (dynasty) {
      const dishIds = new Set(dishes.filter(d => d.dynasty === dynasty).map(d => d.id));
      dishes = dishes.filter(d => dishIds.has(d.id));
      connections = connections.filter(c => dishIds.has(c.from) && dishIds.has(c.to));
    }

    // 构建星图点数据
    const points = dishes.map(dish => ({
      id: dish.id,
      name: dish.name,
      dynasty: dish.dynasty,
      position: { x: dish.x, y: dish.y, z: 0 },
      flavors: {},
      size: dish.size || 15,
      color: this.getDishColor(dish.dynasty),
      difficulty: dish.difficulty,
      taste_profile: dish.taste_profile,
      description: dish.description,
      source_text: dish.source_text,
      backgroundImage: backgroundByDishId.get(dish.id)?.imagePath
    }));

    // 按朝代生成聚类
    const clusters = this.generateClusters(points);

    // 统计信息
    const dynastyCount = {};
    dishes.forEach(dish => {
      const d = dish.dynasty || '未知';
      dynastyCount[d] = (dynastyCount[d] || 0) + 1;
    });

    return {
      points,
      connections,
      clusters,
      statistics: {
        totalDishes: dishes.length,
        dynastyDistribution: dynastyCount
      },
      dimensions: {
        x: { label: '时间轴（朝代）', min: 0, max: 1 },
        y: { label: '难度轴', min: 0, max: 1 }
      }
    };
  }

  /**
   * 获取菜品位置（单个）
   */
  static async getDishPosition(dishId) {
    const starMapData = await PythonBridge.getStarMap();
    const dish = (starMapData.dishes || []).find(d => d.id === dishId);
    const backgroundByDishId = loadDishBackgrounds();
    
    if (!dish) return null;

    // 找出相关菜品（同一朝代或共享食材）
    const relatedConnections = (starMapData.connections || []).filter(
      c => c.from === dishId || c.to === dishId
    );
    const relatedIds = new Set();
    relatedConnections.forEach(c => {
      if (c.from === dishId) relatedIds.add(c.to);
      else relatedIds.add(c.from);
    });

    const relatedDishes = (starMapData.dishes || [])
      .filter(d => relatedIds.has(d.id))
      .map(d => ({
        id: d.id,
        name: d.name,
        dynasty: d.dynasty,
        position: { x: d.x, y: d.y },
        size: d.size || 15,
        color: this.getDishColor(d.dynasty)
      }));

    return {
      id: dish.id,
      name: dish.name,
      dynasty: dish.dynasty,
      position: { x: dish.x, y: dish.y },
      size: dish.size || 15,
      color: this.getDishColor(dish.dynasty),
      difficulty: dish.difficulty,
      taste_profile: dish.taste_profile,
      description: dish.description,
      backgroundImage: backgroundByDishId.get(dish.id)?.imagePath,
      similarDishes: relatedDishes
    };
  }

  /**
   * 根据朝代获取颜色
   */
  static getDishColor(dynasty) {
    const colors = {
      '先秦': '#FF8C00',
      '汉代': '#FF6347',
      '晋代': '#20B2AA',
      '唐代': '#FFD700',
      '宋代': '#4169E1',
      '元代': '#32CD32',
      '明代': '#FF69B4',
      '清代': '#9370DB'
    };
    return colors[dynasty] || '#808080';
  }

  /**
   * 生成味觉聚类
   */
  static generateClusters(points) {
    const clusters = [];
    const dynastyGroups = {};

    points.forEach(point => {
      const dynasty = point.dynasty || '未知';
      if (!dynastyGroups[dynasty]) {
        dynastyGroups[dynasty] = [];
      }
      dynastyGroups[dynasty].push(point);
    });

    for (const [dynasty, groupPoints] of Object.entries(dynastyGroups)) {
      const center = this.calculateCenter(groupPoints);
      clusters.push({
        dynasty,
        center,
        radius: this.calculateRadius(groupPoints, center),
        count: groupPoints.length,
        color: this.getDishColor(dynasty)
      });
    }

    return clusters;
  }

  static calculateCenter(points) {
    if (points.length === 0) return { x: 0, y: 0, z: 0 };
    const sum = points.reduce((acc, p) => ({
      x: acc.x + (p.position?.x || 0),
      y: acc.y + (p.position?.y || 0),
      z: acc.z + (p.position?.z || 0)
    }), { x: 0, y: 0, z: 0 });
    return {
      x: sum.x / points.length,
      y: sum.y / points.length,
      z: sum.z / points.length
    };
  }

  static calculateRadius(points, center) {
    if (points.length === 0) return 0;
    const distances = points.map(p => {
      const dx = (p.position?.x || 0) - center.x;
      const dy = (p.position?.y || 0) - center.y;
      return Math.sqrt(dx * dx + dy * dy);
    });
    return Math.max(...distances) * 1.2;
  }
}

module.exports = StarMapService;
