import { MonHoc } from "../models/index.js"

// =======================
// GET ALL
// =======================
export const getSubjects = async (req, res) => {
    try {
        const data = await MonHoc.findAll({
            order: [["id", "ASC"]] 
        })
        res.json(data)
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: "Lỗi server" })
    }
}

// =======================
// GET BY ID
// =======================
export const getSubjectById = async (req, res) => {
    try {
        const { id } = req.params

        const subject = await MonHoc.findByPk(id)

        if (!subject) {
            return res.status(404).json({ message: "Không tìm thấy môn học" })
        }

        res.json(subject)

    } catch (err) {
        console.error(err)
        res.status(500).json({ message: "Lỗi server" })
    }
}

// =======================
// CREATE
// =======================
export const createSubject = async (req, res) => {
    try {
        const { ten_mon_hoc, mo_ta } = req.body

        // validate
        if (!ten_mon_hoc) {
            return res.status(400).json({ message: "Tên môn học không được để trống" })
        }

        const subject = await MonHoc.create({
            ten_mon_hoc: ten_mon_hoc.trim(),
            mo_ta: mo_ta || ""
        })

        res.json(subject)

    } catch (err) {
        console.error(err)
        res.status(500).json({ message: "Lỗi server" })
    }
}

// =======================
// UPDATE
// =======================
export const updateSubject = async (req, res) => {
    try {
        const { id } = req.params
        const { ten_mon_hoc, mo_ta } = req.body

        const subject = await MonHoc.findByPk(id)

        if (!subject) {
            return res.status(404).json({ message: "Không tìm thấy môn học" })
        }

        subject.ten_mon_hoc = ten_mon_hoc || subject.ten_mon_hoc
        subject.mo_ta = mo_ta || subject.mo_ta

        await subject.save()

        res.json({ message: "Cập nhật thành công" })

    } catch (err) {
        console.error(err)
        res.status(500).json({ message: "Lỗi server" })
    }
}

// =======================
// DELETE
// =======================
export const deleteSubject = async (req, res) => {
    try {
        const { id } = req.params

        const subject = await MonHoc.findByPk(id)

        if (!subject) {
            return res.status(404).json({ message: "Không tìm thấy môn học" })
        }

        await subject.destroy()

        res.json({ message: "Xóa thành công" })

    } catch (err) {
        console.error(err)
        res.status(500).json({ message: "Lỗi server" })
    }
}