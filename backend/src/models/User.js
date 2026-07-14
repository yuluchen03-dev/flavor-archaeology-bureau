const { db } = require('../config/database');
const bcrypt = require('bcryptjs');
const { saltRounds } = require('../config/auth');

class User {
  /**
   * 创建用户
   */
  static async create({ username, email, password }) {
    const password_hash = await bcrypt.hash(password, saltRounds);
    const [id] = await db('users').insert({
      username,
      email,
      password_hash
    });
    return this.findById(id);
  }

  /**
   * 根据ID查找用户
   */
  static async findById(id) {
    const user = await db('users').where({ id }).first();
    if (user) {
      delete user.password_hash;
    }
    return user;
  }

  /**
   * 根据邮箱查找用户（包含密码哈希，用于登录验证）
   */
  static async findByEmail(email) {
    return db('users').where({ email }).first();
  }

  /**
   * 根据用户名查找用户
   */
  static async findByUsername(username) {
    return db('users').where({ username }).first();
  }

  /**
   * 验证密码
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * 更新用户信息
   */
  static async update(id, updates) {
    await db('users').where({ id }).update({
      ...updates,
      updated_at: new Date()
    });
    return this.findById(id);
  }

  /**
   * 获取所有用户（分页）
   */
  static async findAll(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const users = await db('users')
      .select('id', 'username', 'email', 'avatar_url', 'created_at')
      .offset(offset)
      .limit(limit);
    return users;
  }
}

module.exports = User;
