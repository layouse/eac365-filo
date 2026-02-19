const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'eac365_filo',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',  // Boş şifre
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false,
        define: {
            timestamps: false,
            freezeTableName: true
        }
    }
);

// Bağlantıyı test et
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ MySQL veritabanına başarıyla bağlandı!');
        return true;
    } catch (error) {
        console.error('❌ Veritabanı bağlantı hatası:', error.message);
        return false;
    }
};

module.exports = { sequelize, testConnection };