/**
 * 初始数据库结构迁移
 */
exports.up = function(knex) {
  return knex.schema
    // 用户表
    .createTable('users', table => {
      table.increments('id').primary();
      table.string('username').notNullable().unique();
      table.string('email').notNullable().unique();
      table.string('password_hash').notNullable();
      table.string('avatar_url').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    // 菜品表
    .createTable('dishes', table => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('dynasty').nullable();
      table.text('description').nullable();
      table.json('ingredients').nullable();
      table.text('recipe').nullable();
      table.string('image_url').nullable();
      table.float('flavor_sour').defaultTo(0);
      table.float('flavor_sweet').defaultTo(0);
      table.float('flavor_bitter').defaultTo(0);
      table.float('flavor_spicy').defaultTo(0);
      table.float('flavor_salty').defaultTo(0);
      table.float('flavor_umami').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    // 分析记录表
    .createTable('analysis_records', table => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.string('input_type').notNullable(); // 'text', 'image', 'oral'
      table.text('input_content').notNullable();
      table.json('analysis_result').nullable();
      table.json('extracted_clues').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    // 复原记录表
    .createTable('restoration_records', table => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.integer('analysis_id').unsigned().references('id').inTable('analysis_records').onDelete('SET NULL');
      table.integer('dish_id').unsigned().references('id').inTable('dishes').onDelete('SET NULL');
      table.json('restoration_result').nullable();
      table.float('confidence_score').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
    })
    // 教学记录表
    .createTable('teaching_records', table => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.integer('dish_id').unsigned().references('id').inTable('dishes').onDelete('CASCADE');
      table.json('conversation_history').nullable();
      table.string('current_topic').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('teaching_records')
    .dropTableIfExists('restoration_records')
    .dropTableIfExists('analysis_records')
    .dropTableIfExists('dishes')
    .dropTableIfExists('users');
};
