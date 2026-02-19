const express = require('express');
const router = express.Router();

// Geçici işlem veritabanı
let transactions = [];

// Tüm işlemleri getir
router.get('/', (req, res) => {
    try {
        res.json({
            success: true,
            transactions: transactions
        });

    } catch (error) {
        console.error('İşlem listesi hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Sunucu hatası!' 
        });
    }
});

// Yeni işlem ekle
router.post('/', (req, res) => {
    try {
        const { type, category, amount, description, vehicle, date } = req.body;

        const newTransaction = {
            id: Date.now(),
            type,
            category,
            amount: parseFloat(amount),
            description,
            vehicle,
            date: date || new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
        };

        transactions.push(newTransaction);

        res.status(201).json({
            success: true,
            message: 'İşlem başarıyla eklendi!',
            transaction: newTransaction
        });

    } catch (error) {
        console.error('İşlem ekleme hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Sunucu hatası!' 
        });
    }
});

// İşlem güncelle
router.put('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const index = transactions.findIndex(t => t.id === id);

        if (index === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'İşlem bulunamadı!' 
            });
        }

        transactions[index] = {
            ...transactions[index],
            ...req.body,
            id: id
        };

        res.json({
            success: true,
            message: 'İşlem başarıyla güncellendi!',
            transaction: transactions[index]
        });

    } catch (error) {
        console.error('İşlem güncelleme hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Sunucu hatası!' 
        });
    }
});

// İşlem sil
router.delete('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        transactions = transactions.filter(t => t.id !== id);

        res.json({
            success: true,
            message: 'İşlem başarıyla silindi!'
        });

    } catch (error) {
        console.error('İşlem silme hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Sunucu hatası!' 
        });
    }
});

// İstatistikleri getir
router.get('/stats/summary', (req, res) => {
    try {
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = transactions
            .filter(t => t.type === 'expense' || t.type === 'fuel')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalFuel = transactions
            .filter(t => t.type === 'fuel')
            .reduce((sum, t) => sum + t.amount, 0);

        res.json({
            success: true,
            stats: {
                totalIncome,
                totalExpense,
                totalFuel,
                netProfit: totalIncome - totalExpense,
                transactionCount: transactions.length
            }
        });

    } catch (error) {
        console.error('İstatistik hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Sunucu hatası!' 
        });
    }
});

module.exports = router;