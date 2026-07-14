require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { db, config } = require('../config/database');
const path = require('path');
const fs = require('fs');

async function initDatabase() {
  console.log('开始初始化数据库...');
  
  try {
    // 确保数据目录存在
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('创建数据目录:', dataDir);
    }

    // 运行迁移
    console.log('运行数据库迁移...');
    await db.migrate.latest();
    console.log('迁移完成');

    // 运行种子数据
    console.log('插入种子数据...');
    await db.seed.run();
    console.log('种子数据插入完成');

    // 验证数据
    const userCount = await db('users').count('id as count').first();
    const dishCount = await db('dishes').count('id as count').first();
    
    console.log(`\n数据库初始化成功！`);
    console.log(`- 用户数量: ${userCount.count}`);
    console.log(`- 菜品数量: ${dishCount.count}`);
    
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// 运行初始化
initDatabase();
