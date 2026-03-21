import { exec } from "child_process"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { CaiDatHeThong, LichSuSaoLuu } from "../models/index.js"

// fix __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ================= GET SETTINGS
export const getSettings = async (req, res) => {
    try {
        const data = await CaiDatHeThong.findOne()
        res.json(data)
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Lỗi server" })
    }
}

// ================= UPDATE SETTINGS
export const updateSettings = async (req, res) => {
    try {
        const setting = await CaiDatHeThong.findOne()
        await setting.update(req.body)
        res.json({ message: "Cập nhật thành công" })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Lỗi update" })
    }
}

// ================= BACKUP REAL (FIX 1KB)
export const backup = async (req, res) => {
    try {
        const dbName = "omr_exam"
        const user = "root"
        const password = "" // nếu có thì sửa

        const backupDir = path.join(__dirname, "../../backups")

        // tạo folder nếu chưa có
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir)
        }

        const fileName = `backup_${Date.now()}.sql`
        const filePath = path.join(backupDir, fileName)

        // 🔥 KHÔNG dùng dấu >
        const command = `"C:/xampp/mysql/bin/mysqldump.exe" -u ${user} ${password ? `-p${password}` : ""} ${dbName}`

        console.log("CMD:", command)

        exec(command, async (error, stdout, stderr) => {

            if (error) {
                console.error("ERROR:", error)
                console.error("STDERR:", stderr)
                return res.status(500).json({ message: "Backup thất bại" })
            }

            // 🔥 Ghi file từ stdout
            fs.writeFileSync(filePath, stdout)

            const stats = fs.statSync(filePath)

            // nếu file quá nhỏ => lỗi
            if (stats.size < 2000) {
                return res.status(500).json({ message: "File backup rỗng!" })
            }

            // lưu lịch sử
            await LichSuSaoLuu.create({
                thoi_gian: new Date().toLocaleString(),
                dung_luong: (stats.size / 1024 / 1024).toFixed(2) + "MB",
                ten_file: fileName   // 🔥 THÊM DÒNG NÀY
            })
            console.log("BACKUP OK:", stats.size)

            res.download(filePath)
        })

    } catch (err) {
        console.error(err)
        res.status(500).json({ message: "Lỗi backup" })
    }
}

// ================= GET HISTORY
export const getBackupHistory = async (req, res) => {
    try {
        const data = await LichSuSaoLuu.findAll({
            order: [["id", "DESC"]]
        })
        res.json(data)
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Lỗi load history" })
    }
}

import multer from "multer"

const upload = multer({ dest: "uploads/" })

export const uploadMiddleware = upload.single("file")

// ================= RESTORE DATABASE
export const restore = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Chưa chọn file" })
        }

        const filePath = req.file.path

        const dbName = "omr_exam"
        const user = "root"
        const password = ""

        const command = `"C:/xampp/mysql/bin/mysql.exe" -u ${user} ${password ? `-p${password}` : ""} ${dbName} < "${filePath}"`

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(error)
                return res.status(500).json({ message: "Restore thất bại" })
            }

            res.json({ message: "Restore thành công" })
        })

    } catch (err) {
        console.error(err)
        res.status(500).json({ message: "Lỗi restore" })
    }
}

// ================= DOWNLOAD BACKUP FILE
export const downloadBackup = (req, res) => {
    try {
        const fileName = req.params.filename
        const filePath = path.join(__dirname, "../../backups", fileName)

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "Không tìm thấy file" })
        }

        res.download(filePath)
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Lỗi download" })
    }
}

// ================= CLEAR CACHE
export const clearCache = (req, res) => {
    res.json({ message: "Đã xóa cache" })
}