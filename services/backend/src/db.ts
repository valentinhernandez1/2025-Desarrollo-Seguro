import knexConfig from '../knexfile';
import knex from 'knex';

const db = knex(knexConfig);

export default db;
