USE omr_exam;

ALTER TABLE mon_hoc
  ADD COLUMN IF NOT EXISTS giang_vien_id INT NULL AFTER mo_ta,
  ADD COLUMN IF NOT EXISTS lop_id INT NULL AFTER giang_vien_id;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = DATABASE()
     AND table_name = 'mon_hoc'
     AND index_name = 'idx_mon_hoc_giang_vien_id') = 0,
  'ALTER TABLE mon_hoc ADD UNIQUE INDEX idx_mon_hoc_giang_vien_id (giang_vien_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.statistics
   WHERE table_schema = DATABASE()
     AND table_name = 'mon_hoc'
     AND index_name = 'idx_mon_hoc_lop_id') = 0,
  'ALTER TABLE mon_hoc ADD INDEX idx_mon_hoc_lop_id (lop_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO lop_hoc (ten_lop, mo_ta, trang_thai, hoc_ky, nam_hoc, created_at, updated_at)
SELECT 'CNTT-K18', 'Lop cong nghe thong tin K18', 1, '1', '2025-2026', NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM lop_hoc
  WHERE ten_lop = 'CNTT-K18' AND hoc_ky = '1' AND nam_hoc = '2025-2026'
);

SET @lop_k18_id := (
  SELECT id FROM lop_hoc
  WHERE ten_lop = 'CNTT-K18' AND hoc_ky = '1' AND nam_hoc = '2025-2026'
  ORDER BY id ASC
  LIMIT 1
);

INSERT INTO lop_sinh_vien (lop_id, sinh_vien_id, created_at, updated_at)
SELECT @lop_k18_id, tk.user_id, NOW(), NOW()
FROM tai_khoan tk
WHERE tk.role = 'sinhvien'
  AND NOT EXISTS (
    SELECT 1 FROM lop_sinh_vien lsv
    WHERE lsv.lop_id = @lop_k18_id AND lsv.sinh_vien_id = tk.user_id
  )
ORDER BY tk.id ASC
LIMIT 3;

INSERT INTO nguoi_dung (ho_ten, email, mssv, trang_thai, created_at, updated_at)
SELECT 'Giang vien C', 'gv.c@omr.com', NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM nguoi_dung WHERE email = 'gv.c@omr.com');

SET @gv_c_user_id := (SELECT id FROM nguoi_dung WHERE email = 'gv.c@omr.com' LIMIT 1);

INSERT INTO tai_khoan (user_id, username, password, role, so_lan_sai, created_at, updated_at)
SELECT
  @gv_c_user_id,
  'giangvien_c',
  '$2b$10$hjMlQIVAQMdQ/0okQmrBwOi174cYiLueFlZIEpa0ws3grx01HZRaq',
  'giangvien',
  0,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM tai_khoan WHERE username = 'giangvien_c');

INSERT INTO mon_hoc (ten_mon_hoc, mo_ta, giang_vien_id, lop_id, created_at, updated_at)
SELECT 'Lap trinh C', 'Mon hoc lap trinh C', @gv_c_user_id, @lop_k18_id, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM mon_hoc WHERE ten_mon_hoc = 'Lap trinh C');

SET @gv1 := (SELECT user_id FROM tai_khoan WHERE role = 'giangvien' ORDER BY id ASC LIMIT 1 OFFSET 0);
SET @gv2 := (SELECT user_id FROM tai_khoan WHERE role = 'giangvien' ORDER BY id ASC LIMIT 1 OFFSET 1);
SET @gv3 := (SELECT user_id FROM tai_khoan WHERE role = 'giangvien' ORDER BY id ASC LIMIT 1 OFFSET 2);

SET @mon1 := (SELECT id FROM mon_hoc ORDER BY id ASC LIMIT 1 OFFSET 0);
SET @mon2 := (SELECT id FROM mon_hoc ORDER BY id ASC LIMIT 1 OFFSET 1);
SET @mon3 := (SELECT id FROM mon_hoc ORDER BY id ASC LIMIT 1 OFFSET 2);

UPDATE mon_hoc
SET giang_vien_id = @gv1, lop_id = @lop_k18_id
WHERE id = @mon1
  AND @gv1 IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM (SELECT id FROM mon_hoc WHERE giang_vien_id = @gv1 AND id <> @mon1) used);

UPDATE mon_hoc
SET giang_vien_id = @gv2, lop_id = @lop_k18_id
WHERE id = @mon2
  AND @gv2 IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM (SELECT id FROM mon_hoc WHERE giang_vien_id = @gv2 AND id <> @mon2) used);

UPDATE mon_hoc
SET giang_vien_id = @gv3, lop_id = @lop_k18_id
WHERE id = @mon3
  AND @gv3 IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM (SELECT id FROM mon_hoc WHERE giang_vien_id = @gv3 AND id <> @mon3) used);

UPDATE mon_hoc
SET lop_id = @lop_k18_id
WHERE lop_id IS NULL;
