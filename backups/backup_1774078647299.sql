-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: omr_exam
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bai_lam`
--

DROP TABLE IF EXISTS `bai_lam`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bai_lam` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ky_thi_id` int(11) DEFAULT NULL,
  `sinh_vien_id` int(11) DEFAULT NULL,
  `thoi_gian_bat_dau` datetime DEFAULT NULL,
  `thoi_gian_nop` datetime DEFAULT NULL,
  `tong_diem` float DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ky_thi_id` (`ky_thi_id`),
  CONSTRAINT `bai_lam_ibfk_1` FOREIGN KEY (`ky_thi_id`) REFERENCES `ky_thi` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bai_lam`
--

LOCK TABLES `bai_lam` WRITE;
/*!40000 ALTER TABLE `bai_lam` DISABLE KEYS */;
INSERT INTO `bai_lam` VALUES (1,1,3,'2026-03-21 03:42:30','2026-03-21 03:42:30',10,'2026-03-21 03:42:30','2026-03-21 03:42:30'),(2,2,3,'2026-03-21 03:50:53','2026-03-21 03:50:53',10,'2026-03-21 03:50:53','2026-03-21 03:50:53');
/*!40000 ALTER TABLE `bai_lam` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cai_dat_he_thong`
--

DROP TABLE IF EXISTS `cai_dat_he_thong`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cai_dat_he_thong` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `thoi_gian_thi` int(11) DEFAULT NULL,
  `so_cau_toi_da` int(11) DEFAULT NULL,
  `dung_luong_upload` int(11) DEFAULT NULL,
  `so_lan_dang_nhap` int(11) DEFAULT NULL,
  `thoi_gian_phien` int(11) DEFAULT NULL,
  `bat_doi_mat_khau` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cai_dat_he_thong`
--

LOCK TABLES `cai_dat_he_thong` WRITE;
/*!40000 ALTER TABLE `cai_dat_he_thong` DISABLE KEYS */;
INSERT INTO `cai_dat_he_thong` VALUES (1,290,500,50,5,10,1);
/*!40000 ALTER TABLE `cai_dat_he_thong` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cau_hoi`
--

DROP TABLE IF EXISTS `cau_hoi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cau_hoi` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mon_hoc_id` int(11) NOT NULL,
  `noi_dung` text NOT NULL,
  `dap_an_a` varchar(255) DEFAULT NULL,
  `dap_an_b` varchar(255) DEFAULT NULL,
  `dap_an_c` varchar(255) DEFAULT NULL,
  `dap_an_d` varchar(255) DEFAULT NULL,
  `dap_an_dung` varchar(1) DEFAULT NULL,
  `do_kho` int(11) DEFAULT NULL,
  `chuong` int(11) DEFAULT NULL,
  `nguoi_tao_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `mon_hoc_id` (`mon_hoc_id`),
  CONSTRAINT `cau_hoi_ibfk_1` FOREIGN KEY (`mon_hoc_id`) REFERENCES `mon_hoc` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cau_hoi`
--

LOCK TABLES `cau_hoi` WRITE;
/*!40000 ALTER TABLE `cau_hoi` DISABLE KEYS */;
INSERT INTO `cau_hoi` VALUES (1,1,'SQL viết tắt của gì?','Structured Query Language','Simple Query Language','Standard Question Language','None','A',1,1,2,'2026-03-21 03:42:30','2026-03-21 03:42:30'),(2,1,'SELECT dùng để làm gì?','Xóa dữ liệu','Truy vấn dữ liệu','Thêm dữ liệu','Cập nhật dữ liệu','B',1,1,2,'2026-03-21 03:42:30','2026-03-21 03:42:30');
/*!40000 ALTER TABLE `cau_hoi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chi_tiet_bai_lam`
--

DROP TABLE IF EXISTS `chi_tiet_bai_lam`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chi_tiet_bai_lam` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bai_lam_id` int(11) DEFAULT NULL,
  `cau_hoi_id` int(11) DEFAULT NULL,
  `dap_an_chon` varchar(1) DEFAULT NULL,
  `dung_sai` tinyint(1) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `bai_lam_id` (`bai_lam_id`),
  KEY `cau_hoi_id` (`cau_hoi_id`),
  CONSTRAINT `chi_tiet_bai_lam_ibfk_45` FOREIGN KEY (`bai_lam_id`) REFERENCES `bai_lam` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `chi_tiet_bai_lam_ibfk_46` FOREIGN KEY (`cau_hoi_id`) REFERENCES `cau_hoi` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chi_tiet_bai_lam`
--

LOCK TABLES `chi_tiet_bai_lam` WRITE;
/*!40000 ALTER TABLE `chi_tiet_bai_lam` DISABLE KEYS */;
INSERT INTO `chi_tiet_bai_lam` VALUES (1,1,1,'A',1,'2026-03-21 03:42:30','2026-03-21 03:42:30'),(2,1,2,'B',1,'2026-03-21 03:42:30','2026-03-21 03:42:30'),(3,2,1,'A',1,'2026-03-21 03:50:53','2026-03-21 03:50:53'),(4,2,2,'B',1,'2026-03-21 03:50:53','2026-03-21 03:50:53');
/*!40000 ALTER TABLE `chi_tiet_bai_lam` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `de_thi`
--

DROP TABLE IF EXISTS `de_thi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `de_thi` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ky_thi_id` int(11) NOT NULL,
  `cau_hoi_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ky_thi_id` (`ky_thi_id`),
  KEY `cau_hoi_id` (`cau_hoi_id`),
  CONSTRAINT `de_thi_ibfk_45` FOREIGN KEY (`ky_thi_id`) REFERENCES `ky_thi` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `de_thi_ibfk_46` FOREIGN KEY (`cau_hoi_id`) REFERENCES `cau_hoi` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `de_thi`
--

LOCK TABLES `de_thi` WRITE;
/*!40000 ALTER TABLE `de_thi` DISABLE KEYS */;
INSERT INTO `de_thi` VALUES (1,1,1,'2026-03-21 03:42:30','2026-03-21 03:42:30'),(2,1,2,'2026-03-21 03:42:30','2026-03-21 03:42:30'),(3,2,1,'2026-03-21 03:50:53','2026-03-21 03:50:53'),(4,2,2,'2026-03-21 03:50:53','2026-03-21 03:50:53');
/*!40000 ALTER TABLE `de_thi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `file_omr`
--

DROP TABLE IF EXISTS `file_omr`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `file_omr` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ky_thi_id` int(11) DEFAULT NULL,
  `ten_file` varchar(255) DEFAULT NULL,
  `duong_dan` varchar(255) DEFAULT NULL,
  `ngay_tai_len` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ky_thi_id` (`ky_thi_id`),
  CONSTRAINT `file_omr_ibfk_1` FOREIGN KEY (`ky_thi_id`) REFERENCES `ky_thi` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `file_omr`
--

LOCK TABLES `file_omr` WRITE;
/*!40000 ALTER TABLE `file_omr` DISABLE KEYS */;
INSERT INTO `file_omr` VALUES (1,1,'omr_scan_1.png','/uploads/omr_scan_1.png','2026-03-21 03:42:30','2026-03-21 03:42:30','2026-03-21 03:42:30');
/*!40000 ALTER TABLE `file_omr` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ket_qua_omr`
--

DROP TABLE IF EXISTS `ket_qua_omr`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ket_qua_omr` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `file_omr_id` int(11) DEFAULT NULL,
  `sinh_vien_id` int(11) DEFAULT NULL,
  `diem` float DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `file_omr_id` (`file_omr_id`),
  KEY `sinh_vien_id` (`sinh_vien_id`),
  CONSTRAINT `ket_qua_omr_ibfk_45` FOREIGN KEY (`file_omr_id`) REFERENCES `file_omr` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `ket_qua_omr_ibfk_46` FOREIGN KEY (`sinh_vien_id`) REFERENCES `nguoi_dung` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ket_qua_omr`
--

LOCK TABLES `ket_qua_omr` WRITE;
/*!40000 ALTER TABLE `ket_qua_omr` DISABLE KEYS */;
INSERT INTO `ket_qua_omr` VALUES (1,1,3,9,'2026-03-21 03:42:30','2026-03-21 03:42:30');
/*!40000 ALTER TABLE `ket_qua_omr` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ky_thi`
--

DROP TABLE IF EXISTS `ky_thi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ky_thi` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ten_ky_thi` varchar(200) DEFAULT NULL,
  `mon_hoc_id` int(11) DEFAULT NULL,
  `lop_id` int(11) DEFAULT NULL,
  `thoi_gian_lam_bai` int(11) DEFAULT NULL,
  `thoi_gian_bat_dau` datetime DEFAULT NULL,
  `thoi_gian_ket_thuc` datetime DEFAULT NULL,
  `trang_thai` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `mon_hoc_id` (`mon_hoc_id`),
  CONSTRAINT `ky_thi_ibfk_1` FOREIGN KEY (`mon_hoc_id`) REFERENCES `mon_hoc` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ky_thi`
--

LOCK TABLES `ky_thi` WRITE;
/*!40000 ALTER TABLE `ky_thi` DISABLE KEYS */;
INSERT INTO `ky_thi` VALUES (1,'Giữa kỳ CSDL',1,1,60,'2026-03-21 03:42:30','2026-03-21 03:42:30','open','2026-03-21 03:42:30','2026-03-21 03:42:30'),(2,'Giữa kỳ CSDL',1,2,60,'2026-03-21 03:50:53','2026-03-21 03:50:53','open','2026-03-21 03:50:53','2026-03-21 03:50:53');
/*!40000 ALTER TABLE `ky_thi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lich_su_sao_luu`
--

DROP TABLE IF EXISTS `lich_su_sao_luu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lich_su_sao_luu` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `thoi_gian` varchar(50) DEFAULT NULL,
  `dung_luong` varchar(20) DEFAULT NULL,
  `ten_file` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lich_su_sao_luu`
--

LOCK TABLES `lich_su_sao_luu` WRITE;
/*!40000 ALTER TABLE `lich_su_sao_luu` DISABLE KEYS */;
/*!40000 ALTER TABLE `lich_su_sao_luu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lop_hoc`
--

DROP TABLE IF EXISTS `lop_hoc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lop_hoc` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ten_lop` varchar(100) NOT NULL,
  `mo_ta` text DEFAULT NULL,
  `trang_thai` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `hoc_ky` varchar(20) DEFAULT NULL,
  `nam_hoc` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lop_hoc`
--

LOCK TABLES `lop_hoc` WRITE;
/*!40000 ALTER TABLE `lop_hoc` DISABLE KEYS */;
INSERT INTO `lop_hoc` VALUES (1,'CNTT-K18','Lớp công nghệ thông tin',1,'2026-03-21 03:42:30','2026-03-21 03:42:30',NULL,NULL),(2,'CNTT-K18','Lớp CNTT - kỳ 1',1,'2026-03-21 03:50:53','2026-03-21 03:50:53','1','2025-2026'),(3,'CNTT-K18','Lớp CNTT - kỳ 2',1,'2026-03-21 03:50:53','2026-03-21 03:50:53','2','2025-2026');
/*!40000 ALTER TABLE `lop_hoc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lop_sinh_vien`
--

DROP TABLE IF EXISTS `lop_sinh_vien`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lop_sinh_vien` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lop_id` int(11) DEFAULT NULL,
  `sinh_vien_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `lop_id` (`lop_id`),
  KEY `sinh_vien_id` (`sinh_vien_id`),
  CONSTRAINT `lop_sinh_vien_ibfk_45` FOREIGN KEY (`lop_id`) REFERENCES `lop_hoc` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `lop_sinh_vien_ibfk_46` FOREIGN KEY (`sinh_vien_id`) REFERENCES `nguoi_dung` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lop_sinh_vien`
--

LOCK TABLES `lop_sinh_vien` WRITE;
/*!40000 ALTER TABLE `lop_sinh_vien` DISABLE KEYS */;
INSERT INTO `lop_sinh_vien` VALUES (1,1,3,'2026-03-21 03:42:30','2026-03-21 03:42:30'),(2,2,3,'2026-03-21 03:50:53','2026-03-21 03:50:53');
/*!40000 ALTER TABLE `lop_sinh_vien` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mon_hoc`
--

DROP TABLE IF EXISTS `mon_hoc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mon_hoc` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ten_mon_hoc` varchar(150) NOT NULL,
  `mo_ta` text DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mon_hoc`
--

LOCK TABLES `mon_hoc` WRITE;
/*!40000 ALTER TABLE `mon_hoc` DISABLE KEYS */;
INSERT INTO `mon_hoc` VALUES (1,'Cơ sở dữ liệu','Môn học về database','2026-03-21 03:42:30','2026-03-21 03:42:30'),(2,'Nhập môn dữ liệu lớn','Bigdata','2026-03-21 05:05:59','2026-03-21 05:05:59');
/*!40000 ALTER TABLE `mon_hoc` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nguoi_dung`
--

DROP TABLE IF EXISTS `nguoi_dung`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `nguoi_dung` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ho_ten` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `mssv` varchar(20) DEFAULT NULL,
  `trang_thai` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `email_3` (`email`),
  UNIQUE KEY `email_4` (`email`),
  UNIQUE KEY `email_5` (`email`),
  UNIQUE KEY `email_6` (`email`),
  UNIQUE KEY `email_7` (`email`),
  UNIQUE KEY `email_8` (`email`),
  UNIQUE KEY `email_9` (`email`),
  UNIQUE KEY `email_10` (`email`),
  UNIQUE KEY `email_11` (`email`),
  UNIQUE KEY `email_12` (`email`),
  UNIQUE KEY `email_13` (`email`),
  UNIQUE KEY `email_14` (`email`),
  UNIQUE KEY `email_15` (`email`),
  UNIQUE KEY `email_16` (`email`),
  UNIQUE KEY `email_17` (`email`),
  UNIQUE KEY `email_18` (`email`),
  UNIQUE KEY `email_19` (`email`),
  UNIQUE KEY `email_20` (`email`),
  UNIQUE KEY `email_21` (`email`),
  UNIQUE KEY `email_22` (`email`),
  UNIQUE KEY `email_23` (`email`),
  UNIQUE KEY `email_24` (`email`),
  UNIQUE KEY `email_25` (`email`),
  UNIQUE KEY `email_26` (`email`),
  UNIQUE KEY `email_27` (`email`),
  UNIQUE KEY `email_28` (`email`),
  UNIQUE KEY `email_29` (`email`),
  UNIQUE KEY `email_30` (`email`),
  UNIQUE KEY `email_31` (`email`),
  UNIQUE KEY `email_32` (`email`),
  UNIQUE KEY `mssv` (`mssv`),
  UNIQUE KEY `mssv_2` (`mssv`),
  UNIQUE KEY `mssv_3` (`mssv`),
  UNIQUE KEY `mssv_4` (`mssv`),
  UNIQUE KEY `mssv_5` (`mssv`),
  UNIQUE KEY `mssv_6` (`mssv`),
  UNIQUE KEY `mssv_7` (`mssv`),
  UNIQUE KEY `mssv_8` (`mssv`),
  UNIQUE KEY `mssv_9` (`mssv`),
  UNIQUE KEY `mssv_10` (`mssv`),
  UNIQUE KEY `mssv_11` (`mssv`),
  UNIQUE KEY `mssv_12` (`mssv`),
  UNIQUE KEY `mssv_13` (`mssv`),
  UNIQUE KEY `mssv_14` (`mssv`),
  UNIQUE KEY `mssv_15` (`mssv`),
  UNIQUE KEY `mssv_16` (`mssv`),
  UNIQUE KEY `mssv_17` (`mssv`),
  UNIQUE KEY `mssv_18` (`mssv`),
  UNIQUE KEY `mssv_19` (`mssv`),
  UNIQUE KEY `mssv_20` (`mssv`),
  UNIQUE KEY `mssv_21` (`mssv`),
  UNIQUE KEY `mssv_22` (`mssv`),
  UNIQUE KEY `mssv_23` (`mssv`),
  UNIQUE KEY `mssv_24` (`mssv`),
  UNIQUE KEY `mssv_25` (`mssv`),
  UNIQUE KEY `mssv_26` (`mssv`),
  UNIQUE KEY `mssv_27` (`mssv`),
  UNIQUE KEY `mssv_28` (`mssv`),
  UNIQUE KEY `mssv_29` (`mssv`),
  UNIQUE KEY `mssv_30` (`mssv`),
  UNIQUE KEY `mssv_31` (`mssv`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nguoi_dung`
--

LOCK TABLES `nguoi_dung` WRITE;
/*!40000 ALTER TABLE `nguoi_dung` DISABLE KEYS */;
INSERT INTO `nguoi_dung` VALUES (1,'Admin','admin@omr.com',NULL,1,'2026-03-21 03:42:29','2026-03-21 03:42:29'),(2,'Nguyen Van A','gv@omr.com',NULL,1,'2026-03-21 03:42:29','2026-03-21 03:42:29'),(3,'Tran Van B','sv@omr.com','20110001',1,'2026-03-21 03:42:29','2026-03-21 03:42:29'),(4,'Nguyễn Thị Yến Nhi','yennhi@gmail.com',NULL,1,'2026-03-21 03:54:54','2026-03-21 03:54:54');
/*!40000 ALTER TABLE `nguoi_dung` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tai_khoan`
--

DROP TABLE IF EXISTS `tai_khoan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tai_khoan` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','giangvien','sinhvien') DEFAULT 'sinhvien',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `username_2` (`username`),
  UNIQUE KEY `username_3` (`username`),
  UNIQUE KEY `username_4` (`username`),
  UNIQUE KEY `username_5` (`username`),
  UNIQUE KEY `username_6` (`username`),
  UNIQUE KEY `username_7` (`username`),
  UNIQUE KEY `username_8` (`username`),
  UNIQUE KEY `username_9` (`username`),
  UNIQUE KEY `username_10` (`username`),
  UNIQUE KEY `username_11` (`username`),
  UNIQUE KEY `username_12` (`username`),
  UNIQUE KEY `username_13` (`username`),
  UNIQUE KEY `username_14` (`username`),
  UNIQUE KEY `username_15` (`username`),
  UNIQUE KEY `username_16` (`username`),
  UNIQUE KEY `username_17` (`username`),
  UNIQUE KEY `username_18` (`username`),
  UNIQUE KEY `username_19` (`username`),
  UNIQUE KEY `username_20` (`username`),
  UNIQUE KEY `username_21` (`username`),
  UNIQUE KEY `username_22` (`username`),
  UNIQUE KEY `username_23` (`username`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `tai_khoan_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `nguoi_dung` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tai_khoan`
--

LOCK TABLES `tai_khoan` WRITE;
/*!40000 ALTER TABLE `tai_khoan` DISABLE KEYS */;
INSERT INTO `tai_khoan` VALUES (1,1,'admin','$2b$10$TLjNN0FKIVQ8WX4FudVSxuk0IS.vYVJ2GtAf0zbJqBdWPSQ5ZiNXm','admin','2026-03-21 03:42:29','2026-03-21 03:50:53'),(2,2,'giangvien','$2b$10$bom02znxF6j.M54MgUUBNegMs3K42OfgnkEnYY1Zbz9ZtDlfHr2AS','giangvien','2026-03-21 03:42:29','2026-03-21 03:50:53'),(3,3,'sinhvien','$2b$10$uyBZCHU6QROUNF6q.ENFoudyu0ehVUmVg9cAyHqWOjXJnoFBsgW9O','sinhvien','2026-03-21 03:42:29','2026-03-21 03:50:53'),(4,4,'yennhi@gmail.com','$2b$10$iHIQc44b6sdhHhLgSifpSOK0kDJOVLj79H5YO78VWx1Im2DTLHmPy','sinhvien','2026-03-21 03:54:54','2026-03-21 04:17:22');
/*!40000 ALTER TABLE `tai_khoan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `thong_ke_cau_hoi`
--

DROP TABLE IF EXISTS `thong_ke_cau_hoi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `thong_ke_cau_hoi` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cau_hoi_id` int(11) DEFAULT NULL,
  `ty_le_dung` float DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `cau_hoi_id` (`cau_hoi_id`),
  CONSTRAINT `thong_ke_cau_hoi_ibfk_1` FOREIGN KEY (`cau_hoi_id`) REFERENCES `cau_hoi` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thong_ke_cau_hoi`
--

LOCK TABLES `thong_ke_cau_hoi` WRITE;
/*!40000 ALTER TABLE `thong_ke_cau_hoi` DISABLE KEYS */;
INSERT INTO `thong_ke_cau_hoi` VALUES (1,1,0.9,'2026-03-21 03:42:30','2026-03-21 03:42:30');
/*!40000 ALTER TABLE `thong_ke_cau_hoi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `thong_ke_ky_thi`
--

DROP TABLE IF EXISTS `thong_ke_ky_thi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `thong_ke_ky_thi` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ky_thi_id` int(11) DEFAULT NULL,
  `diem_trung_binh` float DEFAULT NULL,
  `diem_cao_nhat` float DEFAULT NULL,
  `diem_thap_nhat` float DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ky_thi_id` (`ky_thi_id`),
  CONSTRAINT `thong_ke_ky_thi_ibfk_1` FOREIGN KEY (`ky_thi_id`) REFERENCES `ky_thi` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thong_ke_ky_thi`
--

LOCK TABLES `thong_ke_ky_thi` WRITE;
/*!40000 ALTER TABLE `thong_ke_ky_thi` DISABLE KEYS */;
INSERT INTO `thong_ke_ky_thi` VALUES (1,1,8,10,6,'2026-03-21 03:42:30','2026-03-21 03:42:30'),(2,2,8,10,6,'2026-03-21 03:50:53','2026-03-21 03:50:53');
/*!40000 ALTER TABLE `thong_ke_ky_thi` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-21 14:37:27
