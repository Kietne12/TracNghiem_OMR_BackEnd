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
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bai_lam`
--

LOCK TABLES `bai_lam` WRITE;
/*!40000 ALTER TABLE `bai_lam` DISABLE KEYS */;
INSERT INTO `bai_lam` VALUES (11,19,3,'2026-03-21 11:40:03','2026-03-21 11:40:12',10,'2026-03-21 11:40:12','2026-03-21 11:40:12'),(12,20,3,'2026-03-21 11:58:08','2026-03-21 11:58:51',10,'2026-03-21 11:58:51','2026-03-21 11:58:51'),(13,22,3,'2026-03-22 09:50:46','2026-03-22 09:52:01',10,'2026-03-22 09:52:01','2026-03-22 09:52:01');
/*!40000 ALTER TABLE `bai_lam` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bai_luyen_tap`
--

DROP TABLE IF EXISTS `bai_luyen_tap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bai_luyen_tap` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mon_hoc_id` int(11) DEFAULT NULL,
  `lop_id` int(11) NOT NULL,
  `ten_bai` varchar(255) NOT NULL,
  `mo_ta` text DEFAULT NULL,
  `so_cau` int(11) NOT NULL DEFAULT 0,
  `thoi_gian_lam_bai` int(11) NOT NULL DEFAULT 60 COMMENT 'phút',
  `cau_hinh` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`cau_hinh`)),
  `trang_thai` enum('active','inactive') DEFAULT 'active',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bai_luyen_tap`
--

LOCK TABLES `bai_luyen_tap` WRITE;
/*!40000 ALTER TABLE `bai_luyen_tap` DISABLE KEYS */;
INSERT INTO `bai_luyen_tap` VALUES (4,1,2,'a','aaa',3,1,'{\"hoc_ky\":\"1\",\"nam_hoc\":\"2025-2026\",\"tong_so_cau\":3,\"cach_tao_de\":\"manual\",\"tron_cau_hoi\":true,\"tron_dap_an\":true,\"so_cau_de\":10,\"so_cau_trung_binh\":10,\"so_cau_kho\":10,\"ds_chuong\":[1],\"ds_cau_hoi_chon\":[27,28,29],\"cho_phep_lam_lai\":true,\"cho_xem_chi_tiet\":true,\"cho_xem_dap_an_dung\":true}','active','2026-03-21 11:24:22','2026-03-21 11:24:22');
/*!40000 ALTER TABLE `bai_luyen_tap` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cai_dat_he_thong`
--

LOCK TABLES `cai_dat_he_thong` WRITE;
/*!40000 ALTER TABLE `cai_dat_he_thong` DISABLE KEYS */;
INSERT INTO `cai_dat_he_thong` VALUES (1,300,500,50,4,1,1);
/*!40000 ALTER TABLE `cai_dat_he_thong` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cau_hinh_ky_thi`
--

DROP TABLE IF EXISTS `cau_hinh_ky_thi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cau_hinh_ky_thi` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ky_thi_id` int(11) NOT NULL,
  `hoc_ky` varchar(20) DEFAULT NULL,
  `nam_hoc` varchar(20) DEFAULT NULL,
  `tong_so_cau` int(11) NOT NULL DEFAULT 30,
  `hinh_thuc_thi` enum('online','omr') NOT NULL DEFAULT 'online',
  `cach_tao_de` enum('manual','auto') NOT NULL DEFAULT 'auto',
  `tron_cau_hoi` tinyint(1) DEFAULT 0,
  `tron_dap_an` tinyint(1) DEFAULT 0,
  `so_ma_de` int(11) DEFAULT 1,
  `so_cau_de` int(11) DEFAULT 0,
  `so_cau_trung_binh` int(11) DEFAULT 0,
  `so_cau_kho` int(11) DEFAULT 0,
  `ds_chuong` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ds_chuong`)),
  `ds_cau_hoi_chon` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ds_cau_hoi_chon`)),
  `ma_de_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ma_de_data`)),
  `cho_phep_chinh_sua` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ky_thi_id` (`ky_thi_id`),
  CONSTRAINT `cau_hinh_ky_thi_ibfk_1` FOREIGN KEY (`ky_thi_id`) REFERENCES `ky_thi` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cau_hinh_ky_thi`
--

LOCK TABLES `cau_hinh_ky_thi` WRITE;
/*!40000 ALTER TABLE `cau_hinh_ky_thi` DISABLE KEYS */;
INSERT INTO `cau_hinh_ky_thi` VALUES (13,18,'1','2025-2026',3,'online','manual',1,1,1,10,10,10,'[]','[29,27,28]','[{\"ma_de\":\"001\",\"question_order\":[29,28,27],\"answer_order\":{\"27\":[\"C\",\"B\",\"D\",\"A\"],\"28\":[\"C\",\"D\",\"B\",\"A\"],\"29\":[\"C\",\"B\",\"D\",\"A\"]}}]',1,'2026-03-21 11:24:04','2026-03-21 11:24:04'),(14,19,'1','2025-2026',3,'online','manual',1,1,1,10,10,10,'[]','[28,29,27]','[{\"ma_de\":\"001\",\"question_order\":[29,28,27],\"answer_order\":{\"27\":[\"A\",\"D\",\"B\",\"C\"],\"28\":[\"A\",\"D\",\"B\",\"C\"],\"29\":[\"A\",\"B\",\"C\",\"D\"]}}]',1,'2026-03-21 11:39:07','2026-03-21 11:39:07'),(15,20,'1','2025-2026',4,'online','manual',1,1,1,10,10,10,'[]','[30,29,28,27]','[{\"ma_de\":\"001\",\"question_order\":[28,27,30,29],\"answer_order\":{\"27\":[\"D\",\"B\",\"A\",\"C\"],\"28\":[\"D\",\"B\",\"A\",\"C\"],\"29\":[\"C\",\"D\",\"A\",\"B\"],\"30\":[\"B\",\"A\",\"C\",\"D\"]}}]',1,'2026-03-21 11:56:48','2026-03-21 11:56:48'),(16,21,'1','2025-2026',4,'omr','manual',1,1,1,10,10,10,'[]','[29,28,27,30]','[{\"ma_de\":\"001\",\"question_order\":[27,28,29,30],\"answer_order\":{\"27\":[\"C\",\"D\",\"A\",\"B\"],\"28\":[\"D\",\"A\",\"C\",\"B\"],\"29\":[\"C\",\"A\",\"D\",\"B\"],\"30\":[\"D\",\"C\",\"B\",\"A\"]}}]',1,'2026-03-21 12:04:18','2026-03-21 12:04:18'),(17,22,'1','2025-2026',4,'online','manual',1,1,1,10,10,10,'[1]','[31,29,30,28]','[{\"ma_de\":\"001\",\"question_order\":[29,31,28,30],\"answer_order\":{\"28\":[\"A\",\"C\",\"B\",\"D\"],\"29\":[\"C\",\"D\",\"B\",\"A\"],\"30\":[\"B\",\"A\",\"C\",\"D\"],\"31\":[\"D\",\"B\",\"C\",\"A\"]}}]',1,'2026-03-22 09:47:45','2026-03-22 09:47:45'),(18,23,'1','2025-2026',4,'omr','auto',1,1,1,0,4,0,'[1]','[29,31,28,27]','[{\"ma_de\":\"001\",\"question_order\":[29,28,27,31],\"answer_order\":{\"27\":[\"D\",\"A\",\"C\",\"B\"],\"28\":[\"B\",\"C\",\"D\",\"A\"],\"29\":[\"C\",\"B\",\"A\",\"D\"],\"31\":[\"A\",\"C\",\"B\",\"D\"]}}]',1,'2026-03-22 09:48:25','2026-03-22 09:48:25');
/*!40000 ALTER TABLE `cau_hinh_ky_thi` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cau_hoi`
--

LOCK TABLES `cau_hoi` WRITE;
/*!40000 ALTER TABLE `cau_hoi` DISABLE KEYS */;
INSERT INTO `cau_hoi` VALUES (27,1,'abc','a','b','c','0','A',2,1,2,'2026-03-21 11:08:32','2026-03-21 11:08:32'),(28,1,'bac','a','b','c','0','B',2,1,2,'2026-03-21 11:08:42','2026-03-21 11:08:42'),(29,1,'cabb','a','b','c','0','C',2,1,2,'2026-03-21 11:08:53','2026-03-21 11:08:53'),(30,1,'dac','a','b','c','d','D',2,1,2,'2026-03-21 11:56:08','2026-03-21 11:56:08'),(31,1,'Hôm nay trời mưa hay nắng','mưa','nắng','ko mưa','ko nắng','B',2,1,2,'2026-03-22 09:46:09','2026-03-22 09:46:09');
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
  CONSTRAINT `chi_tiet_bai_lam_ibfk_55` FOREIGN KEY (`bai_lam_id`) REFERENCES `bai_lam` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `chi_tiet_bai_lam_ibfk_56` FOREIGN KEY (`cau_hoi_id`) REFERENCES `cau_hoi` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chi_tiet_bai_lam`
--

LOCK TABLES `chi_tiet_bai_lam` WRITE;
/*!40000 ALTER TABLE `chi_tiet_bai_lam` DISABLE KEYS */;
INSERT INTO `chi_tiet_bai_lam` VALUES (35,11,28,'B',1,'2026-03-21 11:40:12','2026-03-21 11:40:12'),(36,11,29,'C',1,'2026-03-21 11:40:12','2026-03-21 11:40:12'),(37,11,27,'A',1,'2026-03-21 11:40:12','2026-03-21 11:40:12'),(38,12,30,'D',1,'2026-03-21 11:58:51','2026-03-21 11:58:51'),(39,12,29,'C',1,'2026-03-21 11:58:51','2026-03-21 11:58:51'),(40,12,28,'B',1,'2026-03-21 11:58:51','2026-03-21 11:58:51'),(41,12,27,'A',1,'2026-03-21 11:58:51','2026-03-21 11:58:51'),(42,13,31,'B',1,'2026-03-22 09:52:01','2026-03-22 09:52:01'),(43,13,29,'C',1,'2026-03-22 09:52:01','2026-03-22 09:52:01'),(44,13,30,'D',1,'2026-03-22 09:52:01','2026-03-22 09:52:01'),(45,13,28,'B',1,'2026-03-22 09:52:01','2026-03-22 09:52:01');
/*!40000 ALTER TABLE `chi_tiet_bai_lam` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chi_tiet_bai_luyen_tap`
--

DROP TABLE IF EXISTS `chi_tiet_bai_luyen_tap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `chi_tiet_bai_luyen_tap` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lich_su_bai_id` int(11) NOT NULL COMMENT 'lich_su_bai_luyen_tap.id',
  `cau_hoi_id` int(11) NOT NULL,
  `dap_an_student` char(1) DEFAULT NULL,
  `dap_an_dung` char(1) NOT NULL,
  `dung_sai` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chi_tiet_bai_luyen_tap`
--

LOCK TABLES `chi_tiet_bai_luyen_tap` WRITE;
/*!40000 ALTER TABLE `chi_tiet_bai_luyen_tap` DISABLE KEYS */;
INSERT INTO `chi_tiet_bai_luyen_tap` VALUES (1,8,27,'A','A',1,'2026-03-21 11:18:14','2026-03-21 11:18:14'),(2,8,28,'B','B',1,'2026-03-21 11:18:14','2026-03-21 11:18:14'),(3,8,29,'C','C',1,'2026-03-21 11:18:14','2026-03-21 11:18:14'),(4,10,27,'A','A',1,'2026-03-21 11:26:26','2026-03-21 11:26:26'),(5,10,28,'B','B',1,'2026-03-21 11:26:26','2026-03-21 11:26:26'),(6,10,29,'C','C',1,'2026-03-21 11:26:26','2026-03-21 11:26:26'),(7,12,27,'A','A',1,'2026-03-21 11:26:39','2026-03-21 11:26:39'),(8,12,28,'B','B',1,'2026-03-21 11:26:39','2026-03-21 11:26:39'),(9,12,29,'C','C',1,'2026-03-21 11:26:39','2026-03-21 11:26:39'),(10,16,27,'A','A',1,'2026-03-21 11:38:19','2026-03-21 11:38:19'),(11,16,28,'B','B',1,'2026-03-21 11:38:19','2026-03-21 11:38:19'),(12,16,29,'C','C',1,'2026-03-21 11:38:19','2026-03-21 11:38:19'),(13,18,27,'A','A',1,'2026-03-21 11:57:50','2026-03-21 11:57:50'),(14,18,28,'B','B',1,'2026-03-21 11:57:50','2026-03-21 11:57:50'),(15,18,29,'C','C',1,'2026-03-21 11:57:50','2026-03-21 11:57:50'),(16,22,27,'A','A',1,'2026-03-22 09:52:28','2026-03-22 09:52:28'),(17,22,28,'B','B',1,'2026-03-22 09:52:28','2026-03-22 09:52:28'),(18,22,29,'C','C',1,'2026-03-22 09:52:28','2026-03-22 09:52:28');
/*!40000 ALTER TABLE `chi_tiet_bai_luyen_tap` ENABLE KEYS */;
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
  `ma_de` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ky_thi_id` (`ky_thi_id`),
  KEY `cau_hoi_id` (`cau_hoi_id`),
  CONSTRAINT `de_thi_ibfk_55` FOREIGN KEY (`ky_thi_id`) REFERENCES `ky_thi` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `de_thi_ibfk_56` FOREIGN KEY (`cau_hoi_id`) REFERENCES `cau_hoi` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `de_thi`
--

LOCK TABLES `de_thi` WRITE;
/*!40000 ALTER TABLE `de_thi` DISABLE KEYS */;
INSERT INTO `de_thi` VALUES (63,18,29,'2026-03-21 11:24:04','2026-03-21 11:24:04','001'),(64,18,27,'2026-03-21 11:24:04','2026-03-21 11:24:04','001'),(65,18,28,'2026-03-21 11:24:04','2026-03-21 11:24:04','001'),(66,19,28,'2026-03-21 11:39:07','2026-03-21 11:39:07','001'),(67,19,29,'2026-03-21 11:39:07','2026-03-21 11:39:07','001'),(68,19,27,'2026-03-21 11:39:07','2026-03-21 11:39:07','001'),(69,20,30,'2026-03-21 11:56:48','2026-03-21 11:56:48','001'),(70,20,29,'2026-03-21 11:56:48','2026-03-21 11:56:48','001'),(71,20,28,'2026-03-21 11:56:48','2026-03-21 11:56:48','001'),(72,20,27,'2026-03-21 11:56:48','2026-03-21 11:56:48','001'),(73,21,29,'2026-03-21 12:04:18','2026-03-21 12:04:18','001'),(74,21,28,'2026-03-21 12:04:18','2026-03-21 12:04:18','001'),(75,21,27,'2026-03-21 12:04:18','2026-03-21 12:04:18','001'),(76,21,30,'2026-03-21 12:04:18','2026-03-21 12:04:18','001'),(77,22,31,'2026-03-22 09:47:45','2026-03-22 09:47:45','001'),(78,22,29,'2026-03-22 09:47:45','2026-03-22 09:47:45','001'),(79,22,30,'2026-03-22 09:47:45','2026-03-22 09:47:45','001'),(80,22,28,'2026-03-22 09:47:45','2026-03-22 09:47:45','001'),(81,23,29,'2026-03-22 09:48:25','2026-03-22 09:48:25','001'),(82,23,31,'2026-03-22 09:48:25','2026-03-22 09:48:25','001'),(83,23,28,'2026-03-22 09:48:25','2026-03-22 09:48:25','001'),(84,23,27,'2026-03-22 09:48:25','2026-03-22 09:48:25','001');
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
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `file_omr`
--

LOCK TABLES `file_omr` WRITE;
/*!40000 ALTER TABLE `file_omr` DISABLE KEYS */;
INSERT INTO `file_omr` VALUES (42,21,'test2.jpg','/uploads/omr/1774160534751-705949932.jpg','2026-03-22 06:22:14','2026-03-22 06:22:14','2026-03-22 06:22:14'),(43,21,'test2.jpg','/uploads/omr/1774160984098-557127727.jpg','2026-03-22 06:29:44','2026-03-22 06:29:44','2026-03-22 06:29:44'),(44,21,'test2.jpg','/uploads/omr/1774161126529-896894858.jpg','2026-03-22 06:32:06','2026-03-22 06:32:06','2026-03-22 06:32:06'),(45,21,'test2.jpg','/uploads/omr/1774161296534-129003012.jpg','2026-03-22 06:34:56','2026-03-22 06:34:56','2026-03-22 06:34:56'),(46,21,'test.jpg','/uploads/omr/1774161529023-480132297.jpg','2026-03-22 06:38:49','2026-03-22 06:38:49','2026-03-22 06:38:49'),(47,21,'test2.jpg','/uploads/omr/1774161867961-243598918.jpg','2026-03-22 06:44:27','2026-03-22 06:44:27','2026-03-22 06:44:27'),(48,21,'test2.jpg','/uploads/omr/1774162243918-536982103.jpg','2026-03-22 06:50:43','2026-03-22 06:50:43','2026-03-22 06:50:43');
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
  CONSTRAINT `ket_qua_omr_ibfk_55` FOREIGN KEY (`file_omr_id`) REFERENCES `file_omr` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `ket_qua_omr_ibfk_56` FOREIGN KEY (`sinh_vien_id`) REFERENCES `nguoi_dung` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ket_qua_omr`
--

LOCK TABLES `ket_qua_omr` WRITE;
/*!40000 ALTER TABLE `ket_qua_omr` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ky_thi`
--

LOCK TABLES `ky_thi` WRITE;
/*!40000 ALTER TABLE `ky_thi` DISABLE KEYS */;
INSERT INTO `ky_thi` VALUES (18,'ky1',1,2,1,'2026-03-21 11:25:00','2026-03-21 11:26:00','open','2026-03-21 11:24:04','2026-03-21 11:24:04'),(19,'ky2',1,2,1,'2026-03-21 11:40:00','2026-03-21 11:41:00','open','2026-03-21 11:39:07','2026-03-21 11:39:07'),(20,'ky3',1,2,1,'2026-03-21 11:58:00','2026-03-21 11:59:00','open','2026-03-21 11:56:48','2026-03-21 11:56:48'),(21,'testomr',1,2,60,'2026-03-21 12:04:18','2026-03-21 13:04:18','open','2026-03-21 12:04:18','2026-03-21 12:04:18'),(22,'Test3',1,2,60,'2026-03-22 09:49:00','2026-03-22 10:49:00','open','2026-03-22 09:47:45','2026-03-22 09:47:45'),(23,'test4',1,2,60,'2026-03-22 11:37:00','2026-03-22 12:37:00','open','2026-03-22 09:48:25','2026-03-22 09:48:25');
/*!40000 ALTER TABLE `ky_thi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lich_su_bai_luyen_tap`
--

DROP TABLE IF EXISTS `lich_su_bai_luyen_tap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lich_su_bai_luyen_tap` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bai_luyen_tap_id` int(11) NOT NULL,
  `sinh_vien_id` int(11) NOT NULL,
  `thoi_gian_bat_dau` datetime NOT NULL,
  `thoi_gian_nop` datetime DEFAULT NULL,
  `tong_diem` float DEFAULT NULL,
  `trang_thai` enum('dang_lam','da_nop','da_cham') DEFAULT 'dang_lam',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lich_su_bai_luyen_tap`
--

LOCK TABLES `lich_su_bai_luyen_tap` WRITE;
/*!40000 ALTER TABLE `lich_su_bai_luyen_tap` DISABLE KEYS */;
INSERT INTO `lich_su_bai_luyen_tap` VALUES (15,4,3,'2026-03-21 11:38:13',NULL,NULL,'dang_lam','2026-03-21 11:38:13','2026-03-21 11:38:13'),(16,4,3,'2026-03-21 11:38:13','2026-03-21 11:38:19',10,'da_cham','2026-03-21 11:38:13','2026-03-21 11:38:19'),(17,4,3,'2026-03-21 11:57:43',NULL,NULL,'dang_lam','2026-03-21 11:57:43','2026-03-21 11:57:43'),(18,4,3,'2026-03-21 11:57:43','2026-03-21 11:57:50',10,'da_cham','2026-03-21 11:57:43','2026-03-21 11:57:50'),(19,4,3,'2026-03-21 11:57:56',NULL,NULL,'dang_lam','2026-03-21 11:57:56','2026-03-21 11:57:56'),(20,4,3,'2026-03-21 11:57:56',NULL,NULL,'dang_lam','2026-03-21 11:57:56','2026-03-21 11:57:56'),(21,4,3,'2026-03-22 09:52:23',NULL,NULL,'dang_lam','2026-03-22 09:52:23','2026-03-22 09:52:23'),(22,4,3,'2026-03-22 09:52:23','2026-03-22 09:52:28',10,'da_cham','2026-03-22 09:52:23','2026-03-22 09:52:28'),(23,4,3,'2026-03-22 09:52:32',NULL,NULL,'dang_lam','2026-03-22 09:52:32','2026-03-22 09:52:32'),(24,4,3,'2026-03-22 09:52:32',NULL,NULL,'dang_lam','2026-03-22 09:52:32','2026-03-22 09:52:32');
/*!40000 ALTER TABLE `lich_su_bai_luyen_tap` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lich_su_sao_luu`
--

DROP TABLE IF EXISTS `lich_su_sao_luu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lich_su_sao_luu` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `thoi_gian` varchar(255) DEFAULT NULL,
  `dung_luong` varchar(255) DEFAULT NULL,
  `ten_file` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lich_su_sao_luu`
--

LOCK TABLES `lich_su_sao_luu` WRITE;
/*!40000 ALTER TABLE `lich_su_sao_luu` DISABLE KEYS */;
INSERT INTO `lich_su_sao_luu` VALUES (1,'3/21/2026, 5:41:27 PM','10MB','seed-backup.sql'),(2,'3/22/2026, 5:13:02 PM','0.04MB','backup_1774174378733.sql');
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
  `ten_lop` varchar(100) DEFAULT NULL,
  `mo_ta` text DEFAULT NULL,
  `trang_thai` tinyint(1) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `hoc_ky` varchar(20) DEFAULT NULL,
  `nam_hoc` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lop_hoc`
--

LOCK TABLES `lop_hoc` WRITE;
/*!40000 ALTER TABLE `lop_hoc` DISABLE KEYS */;
INSERT INTO `lop_hoc` VALUES (2,'CNTT-K18','Lớp công nghệ thông tin - kỳ 1',1,'2026-03-20 07:58:58','2026-03-20 07:58:58','1','2025-2026'),(3,'CNTT-K18','Lớp công nghệ thông tin - kỳ 2',1,'2026-03-20 07:58:58','2026-03-20 07:58:58','2','2025-2026');
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
  CONSTRAINT `lop_sinh_vien_ibfk_55` FOREIGN KEY (`lop_id`) REFERENCES `lop_hoc` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `lop_sinh_vien_ibfk_56` FOREIGN KEY (`sinh_vien_id`) REFERENCES `nguoi_dung` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lop_sinh_vien`
--

LOCK TABLES `lop_sinh_vien` WRITE;
/*!40000 ALTER TABLE `lop_sinh_vien` DISABLE KEYS */;
INSERT INTO `lop_sinh_vien` VALUES (2,2,3,'2026-03-20 07:58:58','2026-03-20 07:58:58');
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mon_hoc`
--

LOCK TABLES `mon_hoc` WRITE;
/*!40000 ALTER TABLE `mon_hoc` DISABLE KEYS */;
INSERT INTO `mon_hoc` VALUES (1,'Cơ sở dữ liệu 2','Môn học về database 2','2026-03-16 13:36:29','2026-03-21 10:44:25'),(2,'lap trinh c','c','2026-03-21 12:02:36','2026-03-21 12:02:36');
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
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nguoi_dung`
--

LOCK TABLES `nguoi_dung` WRITE;
/*!40000 ALTER TABLE `nguoi_dung` DISABLE KEYS */;
INSERT INTO `nguoi_dung` VALUES (1,'Admin','admin@omr.com',NULL,1,'2026-03-16 13:36:29','2026-03-16 13:36:29'),(2,'Nguyen Van A','gv@omr.com',NULL,1,'2026-03-16 13:36:29','2026-03-16 13:36:29'),(3,'Tran Van B','sv@omr.com','00001',1,'2026-03-16 13:36:29','2026-03-22 10:33:14'),(15,'Thế Kiệt','hathekiet.td@gmail.com','00002',1,'2026-03-22 10:31:22','2026-03-22 10:31:22'),(16,'Hà Thế Kiệt','hathekiet.t@gmail.com',NULL,1,'2026-03-22 10:31:47','2026-03-22 10:31:47');
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
  `so_lan_sai` int(11) NOT NULL DEFAULT 0,
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
  UNIQUE KEY `username_24` (`username`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `tai_khoan_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `nguoi_dung` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tai_khoan`
--

LOCK TABLES `tai_khoan` WRITE;
/*!40000 ALTER TABLE `tai_khoan` DISABLE KEYS */;
INSERT INTO `tai_khoan` VALUES (1,1,'admin','$2b$10$hjMlQIVAQMdQ/0okQmrBwOi174cYiLueFlZIEpa0ws3grx01HZRaq','admin','2026-03-16 13:36:29','2026-03-22 10:39:45',0),(2,2,'giangvien','$2b$10$xp2C3IHLEo5lfCgy2Kt82uVdpwt5VEaLYf1Cj1cpptuNDvXR6jsfS','giangvien','2026-03-16 13:36:29','2026-03-21 10:41:56',0),(3,3,'sinhvien','$2b$10$O4ktBk9R0b6ZEjlBte8TreLsKc0BIt8rwjv7WfDa0E8folIaGAbyi','sinhvien','2026-03-16 13:36:29','2026-03-22 10:33:14',0),(12,15,'KaiNattawat','$2b$10$I12au7QQLqGMQJIU2Dlh8uMSGT8LjHzYvgzGei8S89TbSEZP/VOnO','sinhvien','2026-03-22 10:31:22','2026-03-22 10:31:22',0),(13,16,'sogiaoduc1','$2b$10$vrHm38Jy3ilXKFgE2gd4s.Q9d9I/ydo/eJqBpIH1EDLHpblxfOqHC','giangvien','2026-03-22 10:31:47','2026-03-22 10:31:47',0);
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
  KEY `cau_hoi_id` (`cau_hoi_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thong_ke_cau_hoi`
--

LOCK TABLES `thong_ke_cau_hoi` WRITE;
/*!40000 ALTER TABLE `thong_ke_cau_hoi` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thong_ke_ky_thi`
--

LOCK TABLES `thong_ke_ky_thi` WRITE;
/*!40000 ALTER TABLE `thong_ke_ky_thi` DISABLE KEYS */;
/*!40000 ALTER TABLE `thong_ke_ky_thi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'omr_exam'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-22 17:52:58
