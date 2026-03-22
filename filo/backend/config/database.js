const mysql = require('mysql2/promise');
require('dotenv').config();

// Güvenli bağlantı havuzu (Connection Pool)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+03:00', // Türkiye saati
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Bağlantı testi
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Veritabanına başarıyla bağlanıldı (utf8mb4)');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Veritabanı bağlantı hatası:', error.message);
        return false;
    }
};

module.exports = { pool, testConnection };