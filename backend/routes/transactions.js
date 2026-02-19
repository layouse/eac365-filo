const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, startDate, endDate, page = 1, limit = 20 } = req.query;

        let where = 'WHERE t.user_id = ?';
        const replacements = [userId];

        if (type && ['income', 'expense', 'fuel'].includes(type)) {
            where += ' AND t.type = ?';
            replacements.push(type);
        }
        if (startDate) { where += ' AND t.transaction_date >= ?'; replacements.push(startDate); }
        if (endDate)   { where += ' AND t.transaction_date <= ?'; replacements.push(endDate); }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const [transactions] = await sequelize.query(
            `SELECT t.*,
                t.transaction_date as date,
                v.plate as vehicle_plate,
                CONCAT(p.name, ' ', p.surname) as personnel_name
             FROM transactions t
             LEFT JOIN vehicles  v ON t.vehicle_id  = v.id
             LEFT JOIN personnel p ON t.personnel_id = p.id
             ${where}
             ORDER BY t.transaction_date DESC
             LIMIT ? OFFSET ?`,
            { replacements: [...replacements, parseInt(limit), offset] }
        );

        const [[{ total }]] = await sequelize.query(
            `SELECT COUNT(*) as total FROM transactions t ${where}`,
            { replacements }
        );

        res.json({
            success: true,
            transactions,
            totalPages: Math.ceil(total / parseInt(limit)),
            total
        });
    } catch (error) {
        console.error('[TRANSACTIONS] Liste hatası:', error.message);
        res.status(500).json({ success: false, error: 'İşlemler yüklenirken hata oluştu.' });
    }
});

router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [[s]] = await sequelize.query(
            `SELECT
                SUM(CASE WHEN type = 'income'            THEN amount ELSE 0 END) as totalIncome,
                SUM(CASE WHEN type IN ('expense','fuel') THEN amount ELSE 0 END) as totalExpense,
                SUM(CASE WHEN type = 'fuel'              THEN amount ELSE 0 END) as totalFuel,
                COUNT(*) as transactionCount
             FROM transactions WHERE user_id = ?`,
            { replacements: [userId] }
        );
        res.json({
            success: true,
            stats: {
                totalIncome:      parseFloat(s.totalIncome)  || 0,
                totalExpense:     parseFloat(s.totalExpense) || 0,
                totalFuel:        parseFloat(s.totalFuel)    || 0,
                netProfit:        (parseFloat(s.totalIncome) || 0) - (parseFloat(s.totalExpense) || 0),
                transactionCount: parseInt(s.transactionCount) || 0
            }
        });
    } catch (error) {
        console.error('[TRANSACTIONS] İstatistik hatası:', error.message);
        res.status(500).json({ success: false, error: 'İstatistikler yüklenirken hata oluştu.' });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, category, amount, description, vehicle_id, personnel_id, date, payment_type, document_no } = req.body;

        const validTypes = ['income', 'expense', 'fuel'];
        if (!type || !validTypes.includes(type)) {
            return res.status(400).json({ success: false, error: 'Geçersiz işlem tipi.' });
        }
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            return res.status(400).json({ success: false, error: 'Geçerli bir tutar girin.' });
        }

        if (vehicle_id) {
            const [v] = await sequelize.query(
                'SELECT id FROM vehicles WHERE id = ? AND user_id = ?',
                { replacements: [parseInt(vehicle_id), userId] }
            );
            if (v.length === 0) return res.status(403).json({ success: false, error: 'Bu araca erişim yetkiniz yok.' });
        }

        if (personnel_id) {
            const [p] = await sequelize.query(
                'SELECT id FROM personnel WHERE id = ? AND user_id = ?',
                { replacements: [parseInt(personnel_id), userId] }
            );
            if (p.length === 0) return res.status(403).json({ success: false, error: 'Bu personele erişim yetkiniz yok.' });
        }

        await sequelize.query(
            `INSERT INTO transactions
             (user_id, vehicle_id, personnel_id, type, category, amount, description, transaction_date, payment_type, document_no)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            {
                replacements: [
                    userId,
                    vehicle_id   ? parseInt(vehicle_id)   : null,
                    personnel_id ? parseInt(personnel_id) : null,
                    type,
                    category?.trim()     || null,
                    parseFloat(amount),
                    description?.trim()  || null,
                    date || new Date().toISOString().split('T')[0],
                    payment_type || 'cash',
                    document_no?.trim()  || null
                ]
            }
        );

        res.status(201).json({ success: true, message: 'İşlem başarıyla eklendi!' });
    } catch (error) {
        console.error('[TRANSACTIONS] Ekleme hatası:', error.message);
        res.status(500).json({ success: false, error: 'İşlem eklenirken hata oluştu.' });
    }
});

router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const txId = parseInt(req.params.id);
        if (isNaN(txId)) return res.status(400).json({ success: false, error: 'Geçersiz işlem ID.' });

        const [existing] = await sequelize.query(
            'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
            { replacements: [txId, userId] }
        );
        if (existing.length === 0) return res.status(404).json({ success: false, error: 'İşlem bulunamadı.' });

        const { type, category, amount, description, date, payment_type, document_no } = req.body;
        const validTypes = ['income', 'expense', 'fuel'];
        if (type && !validTypes.includes(type)) {
            return res.status(400).json({ success: false, error: 'Geçersiz işlem tipi.' });
        }

        await sequelize.query(
            `UPDATE transactions
             SET type = ?, category = ?, amount = ?, description = ?,
                 transaction_date = ?, payment_type = ?, document_no = ?
             WHERE id = ? AND user_id = ?`,
            {
                replacements: [
                    type, category?.trim() || null,
                    amount ? parseFloat(amount) : null,
                    description?.trim() || null,
                    date || new Date().toISOString().split('T')[0],
                    payment_type || 'cash',
                    document_no?.trim() || null,
                    txId, userId
                ]
            }
        );

        res.json({ success: true, message: 'İşlem güncellendi!' });
    } catch (error) {
        console.error('[TRANSACTIONS] Güncelleme hatası:', error.message);
        res.status(500).json({ success: false, error: 'İşlem güncellenirken hata oluştu.' });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const txId = parseInt(req.params.id);
        if (isNaN(txId)) return res.status(400).json({ success: false, error: 'Geçersiz işlem ID.' });

        const [existing] = await sequelize.query(
            'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
            { replacements: [txId, userId] }
        );
        if (existing.length === 0) return res.status(404).json({ success: false, error: 'İşlem bulunamadı.' });

        await sequelize.query(
            'DELETE FROM transactions WHERE id = ? AND user_id = ?',
            { replacements: [txId, userId] }
        );

        res.json({ success: true, message: 'İşlem silindi!' });
    } catch (error) {
        console.error('[TRANSACTIONS] Silme hatası:', error.message);
        res.status(500).json({ success: false, error: 'İşlem silinirken hata oluştu.' });
    }
});

module.exports = router;
