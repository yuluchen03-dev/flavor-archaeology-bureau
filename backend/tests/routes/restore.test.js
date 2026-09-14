const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../src/config/auth');

describe('Restore Routes', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    testUser = await User.create({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123'
    });

    authToken = jwt.sign({ userId: testUser.id }, jwtSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await User.delete(testUser.id);
  });

  describe('POST /api/restore', () => {
    test('应该返回401如果没有认证', async () => {
      const response = await request(app)
        .post('/api/restore')
        .send({ recipe: '古法红烧肉' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('应该返回400如果缺少recipe参数', async () => {
      const response = await request(app)
        .post('/api/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('应该成功复原古菜', async () => {
      const response = await request(app)
        .post('/api/restore')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ recipe: '古法红烧肉' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
});
