const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../src/config/auth');

describe('Teach Routes', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    testUser = await User.create({
      username: 'testuser3',
      email: 'test3@example.com',
      password: 'password123'
    });

    authToken = jwt.sign({ userId: testUser.id }, jwtSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await User.delete(testUser.id);
  });

  describe('POST /api/teach', () => {
    test('应该返回401如果没有认证', async () => {
      const response = await request(app)
        .post('/api/teach')
        .send({ dish: '宫保鸡丁' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('应该返回400如果缺少dish参数', async () => {
      const response = await request(app)
        .post('/api/teach')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('应该成功生成教学内容', async () => {
      const response = await request(app)
        .post('/api/teach')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ dish: '宫保鸡丁' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
});
