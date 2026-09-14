const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../src/config/auth');

describe('Analyze Routes', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // 创建测试用户
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

    // 生成认证token
    authToken = jwt.sign({ userId: testUser.id }, jwtSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    // 清理测试数据
    await User.delete(testUser.id);
  });

  describe('POST /api/analyze', () => {
    test('应该返回401如果没有认证', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({ dish: '红烧肉' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('应该返回400如果缺少dish参数', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('应该成功分析菜品', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ dish: '红烧肉' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
});
