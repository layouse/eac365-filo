const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// =============================================
// FİNANSAL RAPOR (Gelir/Gider Özeti)
// =============================================
router.get('/financial', async (req, res) => {
    try {
        const { start, end } = req.query;
        
        console.log(`📊 Finansal rapor isteği: ${start} - ${end}, Kullanıcı: ${req.user.id}`);

        // Tarih aralığındaki işlemler
        const [transactions] = await pool.execute(
            `SELECT 
                DATE(date) as gun,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as gelir,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as gider,
                SUM(CASE WHEN type = 'fuel' THEN amount ELSE 0 END) as yakit
             FROM transactions 
             WHERE user_id = ? AND date BETWEEN ? AND ?
             GROUP BY DATE(date)
             ORDER BY gun ASC`,
            [req.user.id, start, end]
        );

        // Kategori bazlı dağılım
        const [categories] = await pool.execute(
            `SELECT 
                category,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as gelir,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as gider
             FROM transactions 
             WHERE user_id = ? AND date BETWEEN ? AND ?
             GROUP BY category
             ORDER BY (gelir + gider) DESC`,
            [req.user.id, start, end]
        );

        // Toplamlar
        const [totals] = await pool.execute(
            `SELECT 
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as toplam_gelir,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as toplam_gider,
                SUM(CASE WHEN type = 'fuel' THEN amount ELSE 0 END) as toplam_yakit,
                COUNT(*) as toplam_islem
             FROM transactions 
             WHERE user_id = ? AND date BETWEEN ? AND ?`,
            [req.user.id, start, end]
        );

        // Haftalık veriler (grafik için)
        const weeklyData = [];
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
            const weekStart = new Date(d);
            const weekEnd = new Date(d);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const [week] = await pool.execute(
                `SELECT 
                    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as gelir,
                    SUM(CASE WHEN type = 'expense' OR type = 'fuel' THEN amount ELSE 0 END) as gider
                 FROM transactions 
                 WHERE user_id = ? AND date BETWEEN ? AND ?`,
                [req.user.id, weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]]
            );
            
            weeklyData.push({
                hafta: `${weekStart.toLocaleDateString('tr-TR')} - ${weekEnd.toLocaleDateString('tr-TR')}`,
                gelir: week[0].gelir || 0,
                gider: week[0].gider || 0
            });
        }

        const response = {
            success: true,
            startDate: start,
            endDate: end,
            totals: {
                gelir: totals[0].toplam_gelir || 0,
                gider: totals[0].toplam_gider || 0,
                yakit: totals[0].toplam_yakit || 0,
                islem: totals[0].toplam_islem || 0,
                net: (totals[0].toplam_gelir || 0) - (totals[0].toplam_gider || 0) - (totals[0].toplam_yakit || 0)
            },
            gunluk: transactions,
            kategoriler: categories,
            haftalik: weeklyData
        };

        res.json(response);

    } catch (error) {
        console.error('❌ Finansal rapor hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Rapor oluşturulurken hata oluştu' 
        });
    }
});

// =============================================
// FİLO RAPORU (Araç Bazlı)
// =============================================
router.get('/fleet', async (req, res) => {
    try {
        const { start, end } = req.query;
        
        console.log(`🚛 Filo raporu isteği: ${start} - ${end}, Kullanıcı: ${req.user.id}`);

        const [vehicles] = await pool.execute(
            `SELECT 
                v.id,
                v.plate,
                v.brand,
                v.model,
                v.year,
                v.kilometer as son_km,
                COALESCE(t.toplam_km, 0) as toplam_km,
                COALESCE(t.toplam_yakit, 0) as toplam_yakit,
                COALESCE(t.toplam_yakit_tutari, 0) as toplam_yakit_tutari,
                COALESCE(b.bakim_sayisi, 0) as bakim_sayisi,
                COALESCE(b.bakim_tutari, 0) as bakim_tutari
             FROM vehicles v
             LEFT JOIN (
                SELECT 
                    vehicle_id,
                    SUM(kilometer) as toplam_km,
                    SUM(liters) as toplam_yakit,
                    SUM(total_cost) as toplam_yakit_tutari
                FROM fuel_records
                WHERE date BETWEEN ? AND ?
                GROUP BY vehicle_id
             ) t ON v.id = t.vehicle_id
             LEFT JOIN (
                SELECT 
                    vehicle_id,
                    COUNT(*) as bakim_sayisi,
                    SUM(cost) as bakim_tutari
                FROM maintenance
                WHERE date BETWEEN ? AND ?
                GROUP BY vehicle_id
             ) b ON v.id = b.vehicle_id
             WHERE v.user_id = ?
             ORDER BY v.plate ASC`,
            [start, end, start, end, req.user.id]
        );

        res.json({
            success: true,
            startDate: start,
            endDate: end,
            vehicles: vehicles
        });

    } catch (error) {
        console.error('❌ Filo raporu hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Filo raporu oluşturulurken hata oluştu' 
        });
    }
});

// =============================================
// PERSONEL RAPORU
// =============================================
router.get('/personnel', async (req, res) => {
    try {
        const { start, end } = req.query;
        
        console.log(`👥 Personel raporu isteği: ${start} - ${end}, Kullanıcı: ${req.user.id}`);

        const [personnel] = await pool.execute(
            `SELECT 
                p.id,
                p.name,
                p.surname,
                p.position,
                p.salary,
                COALESCE(maas.odeme, 0) as toplam_maas,
                COALESCE(prim.odeme, 0) as toplam_prim,
                COALESCE(avans.odeme, 0) as toplam_avans
             FROM personnel p
             LEFT JOIN (
                SELECT 
                    personnel_id,
                    SUM(amount) as odeme
                FROM transactions
                WHERE type = 'expense' 
                    AND category = 'salary'
                    AND date BETWEEN ? AND ?
                GROUP BY personnel_id
             ) maas ON p.id = maas.personnel_id
             LEFT JOIN (
                SELECT 
                    personnel_id,
                    SUM(amount) as odeme
                FROM transactions
                WHERE type = 'expense' 
                    AND category = 'bonus'
                    AND date BETWEEN ? AND ?
                GROUP BY personnel_id
             ) prim ON p.id = prim.personnel_id
             LEFT JOIN (
                SELECT 
                    personnel_id,
                    SUM(amount) as odeme
                FROM transactions
                WHERE type = 'expense' 
                    AND category = 'advance'
                    AND date BETWEEN ? AND ?
                GROUP BY personnel_id
             ) avans ON p.id = avans.personnel_id
             WHERE p.user_id = ?
             ORDER BY p.surname ASC`,
            [start, end, start, end, start, end, req.user.id]
        );

        res.json({
            success: true,
            startDate: start,
            endDate: end,
            personnel: personnel
        });

    } catch (error) {
        console.error('❌ Personel raporu hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Personel raporu oluşturulurken hata oluştu' 
        });
    }
});

// =============================================
// YAKIT RAPORU
// =============================================
router.get('/fuel', async (req, res) => {
    try {
        const { start, end } = req.query;
        
        console.log(`⛽ Yakıt raporu isteği: ${start} - ${end}, Kullanıcı: ${req.user.id}`);

        const [fuelData] = await pool.execute(
            `SELECT 
                v.plate,
                v.brand,
                v.model,
                COUNT(f.id) as kayit_sayisi,
                SUM(f.liters) as toplam_litre,
                SUM(f.total_cost) as toplam_tutar,
                AVG(f.price_per_liter) as ortalama_fiyat,
                AVG(f.liters / NULLIF(f.kilometer - LAG(f.kilometer) OVER (PARTITION BY f.vehicle_id ORDER BY f.date), 0)) * 100 as ortalama_tuketim
             FROM fuel_records f
             JOIN vehicles v ON f.vehicle_id = v.id
             WHERE v.user_id = ? AND f.date BETWEEN ? AND ?
             GROUP BY v.id, v.plate, v.brand, v.model
             ORDER BY toplam_tutar DESC`,
            [req.user.id, start, end]
        );

        // Genel özet
        const [summary] = await pool.execute(
            `SELECT 
                SUM(liters) as toplam_litre,
                SUM(total_cost) as toplam_tutar,
                AVG(price_per_liter) as ortalama_fiyat,
                COUNT(*) as toplam_kayit
             FROM fuel_records f
             JOIN vehicles v ON f.vehicle_id = v.id
             WHERE v.user_id = ? AND f.date BETWEEN ? AND ?`,
            [req.user.id, start, end]
        );

        res.json({
            success: true,
            startDate: start,
            endDate: end,
            summary: {
                toplam_litre: summary[0].toplam_litre || 0,
                toplam_tutar: summary[0].toplam_tutar || 0,
                ortalama_fiyat: summary[0].ortalama_fiyat || 0,
                toplam_kayit: summary[0].toplam_kayit || 0
            },
            vehicles: fuelData
        });

    } catch (error) {
        console.error('❌ Yakıt raporu hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Yakıt raporu oluşturulurken hata oluştu' 
        });
    }
});

module.exports = router;