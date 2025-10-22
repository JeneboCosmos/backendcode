// server/config/db.js

const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'jenebocosmos1*',
  database: 'ecommerce',
});

(async () => {
  try {
    const connection = await db.getConnection(); // test a connection
    console.log('Connected to MySQL database');
    connection.release(); // release it back to the pool
  } catch (err) {
    console.error('Error connecting to MySQL:', err.message);
  }
})();

module.exports = db;



