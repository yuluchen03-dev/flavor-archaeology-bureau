exports.up = function up(knex) {
  return knex.schema
    .createTable('user_collections', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('dish_id').notNullable();
      table.string('source').notNullable();
      table.string('rarity').nullable();
      table.string('star_id').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['user_id', 'dish_id']);
    })
    .createTable('daily_draws', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.date('draw_date').notNullable();
      table.string('draw_type').notNullable();
      table.integer('draw_count').notNullable().defaultTo(1);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['user_id', 'draw_date', 'draw_type']);
    })
    .createTable('share_records', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('platform').notNullable();
      table.string('status').notNullable().defaultTo('prepared');
      table.json('card_payload').nullable();
      table.text('copy_text').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = function down(knex) {
  return knex.schema
    .dropTableIfExists('share_records')
    .dropTableIfExists('daily_draws')
    .dropTableIfExists('user_collections');
};
