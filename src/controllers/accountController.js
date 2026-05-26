import {
    Account,
    BaiLam,
    CaiDatHeThong,
    KetQuaOMR,
    LichSuBaiLuyenTap,
    LopHoc,
    LopSinhVien,
    MonHoc,
    User,
    sequelize,
} from "../models/index.js";
import { Op } from "sequelize";

const VALID_ROLES = new Set(["admin", "giangvien", "sinhvien"]);

const normalizeRequiredText = (value) => (
    typeof value === "string" ? value.trim() : ""
);

const normalizeEmail = (value) => normalizeRequiredText(value).toLowerCase();

const parseOptionalBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (value === 1 || value === "1") return true;
    if (value === 0 || value === "0") return false;
    if (typeof value !== "string") return undefined;

    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    return undefined;
};

const normalizeRole = (role) => {
    const normalizedRole = typeof role === "string" && role.trim() !== ""
        ? role.trim().toLowerCase()
        : "sinhvien";

    return VALID_ROLES.has(normalizedRole) ? normalizedRole : null;
};

const isUniqueConstraintError = (error) => (
    error?.name === "SequelizeUniqueConstraintError"
    || error?.parent?.code === "ER_DUP_ENTRY"
    || error?.original?.code === "ER_DUP_ENTRY"
);

const getDuplicateMessage = (error) => {
    const duplicateField = error?.errors?.[0]?.path || "";
    const databaseMessage = `${error?.parent?.sqlMessage || error?.original?.sqlMessage || ""}`.toLowerCase();

    if (duplicateField === "email" || databaseMessage.includes("email")) {
        return "Email đã tồn tại";
    }
    if (duplicateField === "username" || databaseMessage.includes("username")) {
        return "Username đã tồn tại";
    }
    if (duplicateField === "mssv" || databaseMessage.includes("mssv")) {
        return "Mã sinh viên đã tồn tại";
    }

    return "Dữ liệu bị trùng, vui lòng kiểm tra lại";
};

const getValidationMessage = (error) => {
    const validationPath = error?.errors?.[0]?.path;
    if (validationPath === "email") return "Email không hợp lệ";
    return "Dữ liệu không hợp lệ, vui lòng kiểm tra lại";
};

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

const toNullablePositiveInt = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
};

const syncStudentClass = async ({ userId, role, lopId, transaction }) => {
    await LopSinhVien.destroy({
        where: { sinh_vien_id: userId },
        transaction,
    });

    if (role !== "sinhvien" || lopId === null) return;
    if (Number.isNaN(lopId)) {
        throw new Error("Lớp không hợp lệ");
    }

    const lop = await LopHoc.findByPk(lopId, {
        attributes: ["id"],
        raw: true,
        transaction,
    });

    if (!lop) {
        throw new Error("Không tìm thấy lớp");
    }

    await LopSinhVien.create({
        lop_id: lopId,
        sinh_vien_id: userId,
    }, { transaction });
};

// GET ALL
export const getAccounts = async (req, res) => {
    const settings = await CaiDatHeThong.findOne({
        attributes: ["so_lan_dang_nhap"],
        raw: true,
    });
    const maxFailedAttempts = Number(settings?.so_lan_dang_nhap ?? 5);

    const data = await User.findAll({
        include: {
            model: Account,
            as: "tai_khoan",
            attributes: ["username", "role", "so_lan_sai", "must_change_password"],
        },
    });

    const usersNeedSyncLock = data.filter((user) => {
        const failedAttempts = Number(user?.tai_khoan?.so_lan_sai ?? 0);
        return user.trang_thai && failedAttempts >= maxFailedAttempts;
    });

    if (usersNeedSyncLock.length > 0) {
        await Promise.all(
            usersNeedSyncLock.map(async (user) => {
                user.trang_thai = false;
                await user.save();
            })
        );
    }

    const userIds = data.map((user) => user.id);
    const assignments = await LopSinhVien.findAll({
        where: { sinh_vien_id: { [Op.in]: userIds } },
        include: {
            model: LopHoc,
            attributes: ["id", "ten_lop", "hoc_ky", "nam_hoc"],
        },
    });

    const assignmentMap = new Map();
    assignments.forEach((item) => {
        const key = Number(item.sinh_vien_id);
        const current = assignmentMap.get(key) || [];
        current.push(item);
        assignmentMap.set(key, current);
    });

    data.forEach((user) => {
        const classAssignments = assignmentMap.get(Number(user.id)) || [];
        user.setDataValue("lop_sinh_viens", classAssignments);
        user.setDataValue("lop_hoc", classAssignments[0]?.lop_hoc || null);
    });

    res.json(data);
};

export const getAccountMeta = async (req, res) => {
    try {
        const classes = await LopHoc.findAll({
            where: { trang_thai: true },
            attributes: ["id", "ten_lop", "hoc_ky", "nam_hoc"],
            order: [["ten_lop", "ASC"]],
        });

        res.json({ classes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

// CREATE
export const createAccount = async (req, res) => {
    try {
        const { avatar } = req.body;
        const hoTen = normalizeRequiredText(req.body.ho_ten);
        const email = normalizeEmail(req.body.email);
        const username = normalizeRequiredText(req.body.username);
        const password = normalizeRequiredText(req.body.password);
        const normalizedRole = normalizeRole(req.body.role);
        const lopId = toNullablePositiveInt(req.body.lop_id);

        if (!hoTen || !email || !username || !password) {
            return res.status(400).json({ message: "Vui lòng nhập đầy đủ họ tên, email, username và mật khẩu" });
        }

        if (!normalizedRole) {
            return res.status(400).json({ message: "Vai trò không hợp lệ" });
        }

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
            if (normalizedRole === "sinhvien") {
                generatedMssv = await getNextStudentMssv();
            }

            const user = await User.create({
                ho_ten: hoTen,
                email,
                avatar: avatar || null,
                mssv: generatedMssv,
                trang_thai: 1,
            }, { transaction: tx });

            await Account.create({
                user_id: user.id,
                username,
                password,
                role: normalizedRole,
                must_change_password: true,
            }, { transaction: tx });

            await syncStudentClass({
                userId: user.id,
                role: normalizedRole,
                lopId,
                transaction: tx,
            });

            await tx.commit();
            return res.status(201).json({ message: "Tạo tài khoản thành công" });
        } catch (error) {
            await tx.rollback();
            throw error;
        }
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return res.status(400).json({ message: getDuplicateMessage(error) });
        }
        if (error?.name === "SequelizeValidationError") {
            return res.status(400).json({ message: getValidationMessage(error) });
        }

        console.error(error);
        return res.status(500).json({ message: "Lỗi server" });
    }
};

// UPDATE ACCOUNT
export const updateAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { avatar, trang_thai } = req.body;
        const hoTen = normalizeRequiredText(req.body.ho_ten);
        const email = normalizeEmail(req.body.email);
        const username = normalizeRequiredText(req.body.username);
        const password = normalizeRequiredText(req.body.password);
        const mustChangePassword = parseOptionalBoolean(req.body.must_change_password);
        const normalizedRole = normalizeRole(req.body.role);
        const lopId = toNullablePositiveInt(req.body.lop_id);

        if (!hoTen || !email || !username) {
            return res.status(400).json({ message: "Vui lòng nhập đầy đủ họ tên, email và username" });
        }

        if (!normalizedRole) {
            return res.status(400).json({ message: "Vai trò không hợp lệ" });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy user" });
        }

        const tx = await sequelize.transaction();
        try {
            user.ho_ten = hoTen;
            user.email = email;
            user.avatar = avatar || null;
            user.trang_thai = trang_thai;
            await user.save({ transaction: tx });

            await Account.update(
                {
                    username,
                    role: normalizedRole,
                    ...(password ? { password } : {}),
                    ...(password ? { must_change_password: true } : {}),
                    ...(mustChangePassword !== undefined ? { must_change_password: mustChangePassword } : {}),
                },
                {
                    where: { user_id: id },
                    individualHooks: true,
                    transaction: tx,
                }
            );

            await syncStudentClass({
                userId: user.id,
                role: normalizedRole,
                lopId,
                transaction: tx,
            });

            await tx.commit();
            return res.json({ message: "Cập nhật thành công" });
        } catch (error) {
            await tx.rollback();
            throw error;
        }
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            return res.status(400).json({ message: getDuplicateMessage(error) });
        }
        if (error?.name === "SequelizeValidationError") {
            return res.status(400).json({ message: getValidationMessage(error) });
        }

        console.error(error);
        return res.status(500).json({ message: "Lỗi server" });
    }
};

// DELETE
export const deleteAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id, { attributes: ["id"] });

        if (!user) {
            return res.status(404).json({ message: "Không tìm thấy user" });
        }

        const [examAttemptCount, omrResultCount, practiceHistoryCount] = await Promise.all([
            BaiLam.count({ where: { sinh_vien_id: id } }),
            KetQuaOMR.count({ where: { sinh_vien_id: id } }),
            LichSuBaiLuyenTap.count({ where: { sinh_vien_id: id } }),
        ]);

        if (examAttemptCount > 0 || omrResultCount > 0 || practiceHistoryCount > 0) {
            return res.status(409).json({
                message: "Không thể xóa tài khoản vì đã có dữ liệu bài thi/luyện tập/OMR. Hãy khóa tài khoản nếu không muốn cho đăng nhập.",
            });
        }

        const tx = await sequelize.transaction();
        try {
            await LopSinhVien.destroy({ where: { sinh_vien_id: id }, transaction: tx });
            await MonHoc.update(
                { giang_vien_id: null },
                { where: { giang_vien_id: id }, transaction: tx }
            );
            await Account.destroy({ where: { user_id: id }, transaction: tx });
            await User.destroy({ where: { id }, transaction: tx });

            await tx.commit();
            return res.json({ message: "Đã xóa tài khoản" });
        } catch (error) {
            await tx.rollback();
            throw error;
        }
    } catch (error) {
        if (error?.name === "SequelizeForeignKeyConstraintError") {
            return res.status(409).json({
                message: "Không thể xóa tài khoản vì còn dữ liệu liên quan. Hãy khóa tài khoản nếu không muốn cho đăng nhập.",
            });
        }

        console.error(error);
        return res.status(500).json({ message: "Lỗi server" });
    }
};

// LOCK / UNLOCK
export const toggleLock = async (req, res) => {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
        return res.status(404).json({ message: "Không tìm thấy user" });
    }

    const account = await Account.findOne({ where: { user_id: id } });
    if (!account) {
        return res.status(404).json({ message: "Không tìm thấy tài khoản" });
    }

    user.trang_thai = !user.trang_thai;
    await user.save();

    if (user.trang_thai) {
        account.so_lan_sai = 0;
        await account.save();
    }

    res.json({ message: "Đã cập nhật trạng thái" });
};
