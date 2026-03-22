import { spawn } from "child_process"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { CaiDatHeThong, LichSuSaoLuu, sequelize } from "../models/index.js"

// fix __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const resolveMysqldumpPath = () => {
    const envPath = process.env.MYSQLDUMP_PATH
    if (envPath && fs.existsSync(envPath)) {
        return {
            executable: envPath,
            searched: [envPath],
        }
    }

    const searched = []
    const candidateSet = new Set()

    const addCandidate = (candidate) => {
        if (!candidate) return
        const normalized = candidate.replace(/\\/g, "/")
        candidateSet.add(normalized)
    }

    ["C", "D", "E"].forEach((drive) => {
        addCandidate(`${drive}:/xampp/mysql/bin/mysqldump.exe`)
        addCandidate(`${drive}:/xampp/mariadb/bin/mysqldump.exe`)
        addCandidate(`${drive}:/laragon/bin/mysql/mysql-8.0.30-winx64/bin/mysqldump.exe`)
    });

    [
        "C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqldump.exe",
        "C:/Program Files/MySQL/MySQL Server 5.7/bin/mysqldump.exe",
        "C:/Program Files/MariaDB 10.4/bin/mysqldump.exe",
        "C:/Program Files/MariaDB 10.5/bin/mysqldump.exe",
    ].forEach(addCandidate);

    const candidates = [...candidateSet]

    for (const candidate of candidates) {
        searched.push(candidate)
        if (fs.existsSync(candidate)) {
            return {
                executable: candidate,
                searched,
            }
        }
    }

    // Fallback: thử dùng mysqldump từ PATH hệ thống.
    return {
        executable: "mysqldump",
        searched,
    }
}

const resolveMysqlClientPath = () => {
    const envPath = process.env.MYSQL_CLIENT_PATH
    if (envPath && fs.existsSync(envPath)) {
        return {
            executable: envPath,
            searched: [envPath],
        }
    }

    const searched = []
    const candidateSet = new Set()

    const addCandidate = (candidate) => {
        if (!candidate) return
        const normalized = candidate.replace(/\\/g, "/")
        candidateSet.add(normalized)
    }

    ["C", "D", "E"].forEach((drive) => {
        addCandidate(`${drive}:/xampp/mysql/bin/mysql.exe`)
        addCandidate(`${drive}:/xampp/mariadb/bin/mysql.exe`)
        addCandidate(`${drive}:/laragon/bin/mysql/mysql-8.0.30-winx64/bin/mysql.exe`)
    });

    [
        "C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe",
        "C:/Program Files/MySQL/MySQL Server 5.7/bin/mysql.exe",
        "C:/Program Files/MariaDB 10.4/bin/mysql.exe",
        "C:/Program Files/MariaDB 10.5/bin/mysql.exe",
    ].forEach(addCandidate);

    const candidates = [...candidateSet]

    for (const candidate of candidates) {
        searched.push(candidate)
        if (fs.existsSync(candidate)) {
            return {
                executable: candidate,
                searched,
            }
        }
    }

    return {
        executable: "mysql",
        searched,
    }
}

const normalizeTableName = (table) => {
    if (!table) return null
    if (typeof table === "string") return table
    return table.tableName || table.table_name || null
}

const truncateAllTables = async () => {
    const qi = sequelize.getQueryInterface()
    const rawTables = await qi.showAllTables()
    const tables = rawTables
        .map(normalizeTableName)
        .filter((table) => typeof table === "string" && table.trim() !== "")

    if (tables.length === 0) return

    await sequelize.query("SET FOREIGN_KEY_CHECKS = 0")
    try {
        for (const table of tables) {
            const escaped = table.replace(/`/g, "``")
            await sequelize.query(`TRUNCATE TABLE \`${escaped}\``)
        }
    } finally {
        await sequelize.query("SET FOREIGN_KEY_CHECKS = 1")
    }
}

const DEFAULT_SYSTEM_SETTINGS = {
    so_lan_dang_nhap: 5,
    thoi_gian_phien: 30,
    bat_doi_mat_khau: false,
}

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback
    }
    return parsed
}

// ================= GET SETTINGS
export const getSettings = async (req, res) => {
    try {
        let data = await CaiDatHeThong.findOne()

        if (!data) {
            data = await CaiDatHeThong.create(DEFAULT_SYSTEM_SETTINGS)
        }

        res.json(data)
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Lỗi server" })
    }
}

// ================= UPDATE SETTINGS
export const updateSettings = async (req, res) => {
    try {
        let setting = await CaiDatHeThong.findOne()
        if (!setting) {
            setting = await CaiDatHeThong.create(DEFAULT_SYSTEM_SETTINGS)
        }

        const payload = {
            so_lan_dang_nhap: parsePositiveInt(
                req.body?.so_lan_dang_nhap,
                setting.so_lan_dang_nhap ?? DEFAULT_SYSTEM_SETTINGS.so_lan_dang_nhap
            ),
            thoi_gian_phien: parsePositiveInt(
                req.body?.thoi_gian_phien,
                setting.thoi_gian_phien ?? DEFAULT_SYSTEM_SETTINGS.thoi_gian_phien
            ),
            bat_doi_mat_khau: Boolean(req.body?.bat_doi_mat_khau),
        }

        await setting.update(payload)
        res.json({ message: "Cập nhật thành công" })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Lỗi update" })
    }
}

// ================= BACKUP REAL (FIX 1KB)
export const backup = async (req, res) => {
    try {
        const dbName = process.env.DB_NAME || "omr_exam"
        const user = process.env.DB_USER || "root"
        const password = process.env.DB_PASSWORD || ""

        const backupDir = path.join(__dirname, "../../backups")
        const { executable: mysqldumpPath, searched } = resolveMysqldumpPath()

        // tạo folder nếu chưa có
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true })
        }

        const fileName = `backup_${Date.now()}.sql`
        const filePath = path.join(backupDir, fileName)
        const args = [
            "--single-transaction",
            "--quick",
            "--routines",
            "--triggers",
            "-u",
            user,
        ]

        if (password) {
            args.push(`-p${password}`)
        }

        args.push(dbName)

        const stats = await new Promise((resolve, reject) => {
            const dumpProcess = spawn(mysqldumpPath, args, { windowsHide: true })
            const outputStream = fs.createWriteStream(filePath)
            let stderrOutput = ""

            dumpProcess.stdout.pipe(outputStream)
            dumpProcess.stderr.on("data", (chunk) => {
                stderrOutput += chunk.toString()
            })

            dumpProcess.on("error", (error) => {
                outputStream.destroy()
                if (error.code === "ENOENT") {
                    reject(
                        new Error(
                            `Không tìm thấy mysqldump.exe. Hãy cấu hình MYSQLDUMP_PATH hoặc thêm mysqldump vào PATH. ` +
                            `Đã dò: ${searched.join(" | ") || "(không có đường dẫn cố định)"}`
                        )
                    )
                    return
                }
                reject(new Error(`Không thể chạy mysqldump: ${error.message}`))
            })

            dumpProcess.on("close", (code) => {
                outputStream.end()
                if (code !== 0) {
                    reject(new Error(`Backup thất bại: ${stderrOutput || `Exit code ${code}`}`))
                    return
                }

                try {
                    const fileStats = fs.statSync(filePath)
                    if (fileStats.size < 2000) {
                        reject(new Error("File backup rỗng hoặc quá nhỏ"))
                        return
                    }
                    resolve(fileStats)
                } catch (error) {
                    reject(error)
                }
            })
        })

        await LichSuSaoLuu.create({
            thoi_gian: new Date().toLocaleString(),
            dung_luong: (stats.size / 1024 / 1024).toFixed(2) + "MB",
            ten_file: fileName,
        })

        return res.download(filePath)

    } catch (err) {
        console.error(err)
        res.status(500).json({ message: err.message || "Lỗi backup" })
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

        const dbName = process.env.DB_NAME || "omr_exam"
        const user = process.env.DB_USER || "root"
        const password = process.env.DB_PASSWORD || ""
        const { executable: mysqlPath, searched } = resolveMysqlClientPath()

        await truncateAllTables()

        await new Promise((resolve, reject) => {
            const args = ["-u", user, dbName]
            if (password) {
                args.splice(2, 0, `-p${password}`)
            }

            const mysqlProcess = spawn(mysqlPath, args, { windowsHide: true })
            const inputStream = fs.createReadStream(filePath)
            let stderrOutput = ""

            mysqlProcess.stderr.on("data", (chunk) => {
                stderrOutput += chunk.toString()
            })

            mysqlProcess.on("error", (error) => {
                if (error.code === "ENOENT") {
                    reject(
                        new Error(
                            `Không tìm thấy mysql.exe. Hãy cấu hình MYSQL_CLIENT_PATH hoặc thêm mysql vào PATH. ` +
                            `Đã dò: ${searched.join(" | ") || "(không có đường dẫn cố định)"}`
                        )
                    )
                    return
                }
                reject(new Error(`Không thể chạy mysql client: ${error.message}`))
            })

            inputStream.on("error", (error) => {
                reject(new Error(`Không đọc được file backup: ${error.message}`))
            })

            inputStream.pipe(mysqlProcess.stdin)

            mysqlProcess.on("close", (code) => {
                if (code !== 0) {
                    reject(new Error(`Restore thất bại: ${stderrOutput || `Exit code ${code}`}`))
                    return
                }
                resolve()
            })
        })

        fs.unlink(filePath, () => {})

        res.json({ message: "Restore thành công" })

    } catch (err) {
        console.error(err)
        res.status(500).json({ message: err.message || "Lỗi restore" })
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

