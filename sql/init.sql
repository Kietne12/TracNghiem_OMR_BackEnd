-- Tạo database (nếu chưa có)
CREATE DATABASE IF NOT EXISTS omr_exam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE omr_exam;

-- Bảng users
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  ho_ten      VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  mssv        VARCHAR(20)   DEFAULT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  role        ENUM('admin', 'giangvien', 'sinhvien') NOT NULL DEFAULT 'sinhvien',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Dữ liệu mẫu (password = "123456" đã hash bằng bcrypt)
-- Bạn có thể tạo hash mới bằng script seed bên dưới
-- ============================================================
-- INSERT INTO users (ho_ten, email, mssv, password, role) VALUES
-- ('Admin', 'admin@omr.com', NULL, '<bcrypt_hash>', 'admin'),
-- ('Nguyen Van A', 'gv@omr.com', NULL, '<bcrypt_hash>', 'giangvien'),
-- ('Tran Van B', 'sv@omr.com', '20110001', '<bcrypt_hash>', 'sinhvien');
