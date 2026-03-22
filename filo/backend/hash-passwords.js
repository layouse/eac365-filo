const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function hashPasswords() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '', // XAMPP'te boş
        database: 'eac365_filo'
    });

    // Tüm kullanıcıları al
    const [users] = await connection.execute('SELECT id, password FROM users');
    
    console.log(`${users.length} kullanıcı bulundu`);
    
    for (const user of users) {
        // Şifreyi hash'le
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        // Güncelle
        await connection.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, user.id]
        );
        
        console.log(`Kullanıcı ${user.id} güncellendi`);
    }
    
    console.log('Tüm şifreler hash\'lendi!');
    await connection.end();
}

hashPasswords();