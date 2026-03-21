import { User, Account, sequelize } from "../models/index.js";
import { Op } from "sequelize";

const parseNumericMssv = (value) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    return Number.parseInt(trimmed, 10);
};

const getNextStudentMssv = async () => {
    const users = await User.findAll({
        attributes: ["mssv"],
        where: { mssv: { [Op.ne]: null } },
        raw: true,
    });

    let maxNumeric = 0;
    let maxLength = 4;

    for (const row of users) {
        const rawMssv = String(row.mssv || "").trim();
        const parsed = parseNumericMssv(rawMssv);
        if (parsed === null) continue;

        if (parsed > maxNumeric) {
            maxNumeric = parsed;
        }

        if (rawMssv.length > maxLength) {
            maxLength = rawMssv.length;
        }
    }

    return String(maxNumeric + 1).padStart(Math.max(4, maxLength), "0");
};

// GET ALL
export const getAccounts = async (req, res) => {
    const data = await User.findAll({
        include: {
            model: Account,
            as: "tai_khoan",
            attributes: ["username", "role"],
        },
    });

    res.json(data);
};


// CREATE
export const createAccount = async (req, res) => {
    try {
        const { ho_ten, email, username, password, role } = req.body;

        const existingEmail = await User.findOne({
            where: { email },
            attributes: ["id"],
            raw: true,
        });

        if (existingEmail) {
            return res.status(400).json({ message: "Email đã tồn tại" });
        }

        const existingUsername = await Account.findOne({
            where: { username },
            attributes: ["id"],
            raw: true,
        });

        if (existingUsername) {
            return res.status(400).json({ message: "Username đã tồn tại" });
        }

        const tx = await sequelize.transaction();
        try {
            let generatedMssv = null;
            if (role === "sinhvien") {
                generatedMssv = await getNextStudentMssv();
            }

            const user = await User.create({
                ho_ten,
                email,
                mssv: generatedMssv,
                trang_thai: 1,
            }, { transaction: tx });

            await Account.create({
                user_id: user.id,
                username: username,
                // Account model has beforeCreate hook to hash password.
                password,
                role,
            }, { transaction: tx });

            await tx.commit();
            return res.json({ message: "Tạo tài khoản thành công" });
        } catch (error) {
            await tx.rollback();
            throw error;
        }
    } catch (error) {
        if (error?.name === "SequelizeUniqueConstraintError") {
            const duplicateField = error?.errors?.[0]?.path;
            if (duplicateField === "email") {
                return res.status(400).json({ message: "Email đã tồn tại" });
            }
            if (duplicateField === "username") {
                return res.status(400).json({ message: "Username đã tồn tại" });
            }
            return res.status(400).json({ message: "Dữ liệu bị trùng, vui lòng kiểm tra lại" });
        }

        console.error(error);
        return res.status(500).json({ message: "Lỗi server" });
    }
};

// UPDATE ACCOUNT
export const updateAccount = async (req, res) => {
    try {
        const { id } = req.params
        const { ho_ten, email, role, password, trang_thai, username } = req.body

        // kiểm tra user tồn tại
        const user = await User.findByPk(id)

        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy user" })
        }

        // update bảng User
        user.ho_ten = ho_ten
        user.email = email
        user.trang_thai = trang_thai
        await user.save()

        // 🔥 update bảng Account (KHÔNG phụ thuộc relation nữa)
        await Account.update(
            {
                username: username,
                role: role,
                ...(password && password.trim() !== ""
                    ? { password }
                    : {})
            },
            {
                where: { user_id: id },
                individualHooks: true,
            }
        )

        res.json({ message: "Cập nhật thành công" })

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Lỗi server" })
    }
}

// DELETE
export const deleteAccount = async (req, res) => {
    const { id } = req.params;

    await Account.destroy({ where: { user_id: id } });
    await User.destroy({ where: { id } });

    res.json({ message: "Đã xóa" });
};


// LOCK / UNLOCK
export const toggleLock = async (req, res) => {
    const { id } = req.params;

    const user = await User.findByPk(id);

    user.trang_thai = !user.trang_thai;
    await user.save();

    res.json({ message: "Đã cập nhật trạng thái" });
};

