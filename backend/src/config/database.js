const knex = require('knex');
const path = require('path');

const config = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, '../../data/flavor_archaeology.db')
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, '../migrations')
    },
    seeds: {
      directory: path.join(__dirname, '../seeds')
    }
  },
  production: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, '../../data/flavor_archaeology.db')
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, '../migrations')
    },
    seeds: {
      directory: path.join(__dirname, '../seeds')
    }
  },
  test: {
    client: 'sqlite3',
    connection: {
      filename: ':memory:'
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, '../migrations')
    },
    seeds: {
      directory: path.join(__dirname, '../seeds')
    }
  }
};

const environment = process.env.NODE_ENV || 'development';
const db = knex(config[environment]);

module.exports = { db, config };
