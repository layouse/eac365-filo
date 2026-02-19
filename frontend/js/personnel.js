// YENİ PERSONEL EKLE (GEÇİCİ ÇÖZÜM)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { 
            name, surname, tc_no, phone, email, 
            position, salary, start_date, status, 
            address, notes 
        } = req.body;

        console.log('Personel ekleme isteği:', req.body);

        // Validasyon
        if (!name || !surname) {
            return res.status(400).json({ 
                success: false, 
                error: 'Ad ve soyad zorunludur!' 
            });
        }

        // ÖNCE KULLANICI VAR MI KONTROL ET
        const [users] = await sequelize.query(
            'SELECT id FROM users WHERE id = ?',
            { replacements: [req.user.id] }
        );

        // Eğer kullanıcı yoksa, users tablosuna ekle
        if (users.length === 0) {
            console.log('Kullanıcı bulunamadı, yeni kullanıcı oluşturuluyor...');
            await sequelize.query(
                `INSERT INTO users (id, name, company, email, password, role) 
                 VALUES (?, ?, ?, ?, ?, 'user')`,
                {
                    replacements: [
                        req.user.id,
                        req.user.name || 'Kullanıcı',
                        'EAC Lojistik',
                        req.user.email || 'kullanici@eac365.com',
                        '123456'
                    ]
                }
            );
        }

        // Personeli ekle
        const [result] = await sequelize.query(
            `INSERT INTO personnel (
                user_id, name, surname, tc_no, phone, email, 
                position, salary, start_date, status, address, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            {
                replacements: [
                    req.user.id,  // Token'dan gelen ID
                    name,
                    surname,
                    tc_no || null,
                    phone || null,
                    email || null,
                    position || 'driver',
                    salary || null,
                    start_date || null,
                    status || 'active',
                    address || null,
                    notes || null
                ]
            }
        );

        // Yeni eklenen personeli getir
        const [newPersonnel] = await sequelize.query(
            'SELECT * FROM personnel WHERE id = ?',
            { replacements: [result.insertId] }
        );

        res.status(201).json({
            success: true,
            message: 'Personel başarıyla eklendi!',
            personnel: newPersonnel[0]
        });

    } catch (error) {
        console.error('Personel ekleme hatası:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});