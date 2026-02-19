-- Veritabanını oluştur
CREATE DATABASE IF NOT EXISTS eac365_filo;
USE eac365_filo;

-- Kullanıcılar tablosu
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    company VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Araçlar tablosu
CREATE TABLE IF NOT EXISTS vehicles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    plate VARCHAR(20) NOT NULL,
    brand VARCHAR(50),
    model VARCHAR(50),
    year INT,
    fuel_type ENUM('diesel', 'gasoline', 'lpg', 'electric') DEFAULT 'diesel',
    status ENUM('active', 'passive', 'maintenance') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- İşlemler tablosu (gelir/gider/yakıt)
CREATE TABLE IF NOT EXISTS transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    vehicle_id INT,
    type ENUM('income', 'expense', 'fuel') NOT NULL,
    category VARCHAR(50),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

-- Personel tablosu
CREATE TABLE IF NOT EXISTS personnel (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    tc_no VARCHAR(11) UNIQUE,
    phone VARCHAR(20),
    email VARCHAR(100),
    position VARCHAR(50),
    salary DECIMAL(10,2),
    start_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Yakıt kayıtları tablosu
CREATE TABLE IF NOT EXISTS fuel_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    vehicle_id INT NOT NULL,
    date DATE NOT NULL,
    liters DECIMAL(10,2) NOT NULL,
    price_per_liter DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    kilometer INT,
    station VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- Örnek test kullanıcısı (şifre: 123456)
INSERT INTO users (name, company, email, phone, password) VALUES 
('Test Kullanıcı', 'EAC Lojistik', 'test@eac365.com', '05321234567', '$2a$10$XkPq7XkPq7XkPq7XkPq7Xu123456789012345678901234567890');