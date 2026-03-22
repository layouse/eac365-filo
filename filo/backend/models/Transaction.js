const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('transactions', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    vehicle_id: {
        type: DataTypes.INTEGER
    },
    type: {
        type: DataTypes.ENUM('income', 'expense', 'fuel'),
        allowNull: false
    },
    category: {
        type: DataTypes.STRING(50)
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    transaction_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    }
}, {
    timestamps: false
});

module.exports = Transaction;