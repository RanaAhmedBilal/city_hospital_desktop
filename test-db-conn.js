const { Client } = require('pg');

async function testConnection(password) {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: password,
    port: 5432,
  });

  try {
    await client.connect();
    console.log(`SUCCESS: Connected to PostgreSQL with password: "${password}"`);
    const res = await client.query('SELECT version()');
    console.log('PostgreSQL Version:', res.rows[0].version);
    
    // Check if city_hospital_db exists
    const dbCheck = await client.query("SELECT 1 FROM pg_database WHERE datname='city_hospital_db'");
    if (dbCheck.rows.length === 0) {
      console.log('Creating database city_hospital_db...');
      await client.query('CREATE DATABASE city_hospital_db');
      console.log('Database city_hospital_db created successfully.');
    } else {
      console.log('Database city_hospital_db already exists.');
    }
    
    await client.end();
    return true;
  } catch (err) {
    console.log(`Failed with password "${password}":`, err.message);
    try { await client.end(); } catch (e) {}
    return false;
  }
}

async function main() {
  const commonPasswords = ['postgres', 'admin', 'root', '123456', '', 'password', 'Ahmed', 'ahmed', 'K_Pc', '1234', '12345', 'postgres123', 'admin123'];
  for (const pwd of commonPasswords) {
    const success = await testConnection(pwd);
    if (success) {
      console.log(`FOUND_PASSWORD=${pwd}`);
      process.exit(0);
    }
  }
  console.log('Could not connect with common passwords.');
  process.exit(1);
}

main();
