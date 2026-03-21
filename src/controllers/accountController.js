import { User, Account } from "../models/index.js";
import bcrypt from "bcrypt";

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
    const { ho_ten, email, username, password, role } = req.body;

    const user = await User.create({
        ho_ten,
        email,
        trang_thai: 1,
    });

    const hashed = await bcrypt.hash(password, 10);

    await Account.create({
        user_id: user.id,
        username: username,
        password: hashed,
        role,
    });

    res.json({ message: "Tạo tài khoản thành công" });
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
                    ? { password: await bcrypt.hash(password, 10) }
                    : {})
            },
            {
                where: { user_id: id }
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

