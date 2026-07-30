require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');

  console.log('Menjalankan schema.sql ...');
  await pool.query(schema);
  console.log('Schema OK.');

  const skipSeed = process.argv.includes('--no-seed');
  if (!skipSeed) {
    console.log('Menjalankan seed.sql ...');
    await pool.query(seed);
    console.log('Seed OK.');
  }

  await pool.end();
  console.log('Selesai.');
}

run().catch((err) => {
  console.error('Gagal init database:', err);
  process.exit(1);
});
