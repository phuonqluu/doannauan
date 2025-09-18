const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");

// Kết nối MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", 
  database: "congthucnauan",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Kết nối MySQL thành công!");
});

// API tổng số công thức và hiển thị danh sách công thức
router.get('/admin/congthuc', async (req, res) => {
  try {
    const [countResult] = await db.promise().query('SELECT COUNT(*) AS total FROM CongThuc');
    const [recipes] = await db.promise().query('SELECT * FROM CongThuc');
    res.json({
      total: countResult[0].total,
      recipes: recipes
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách công thức:", error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách công thức" });
  }
});

// API tổng số người dùng và liệt kê tất cả người dùng
router.get('/admin/nguoidung', async (req, res) => {
  try {
    const [countResult] = await db.promise().query('SELECT COUNT(*) AS total FROM NguoiDung');
    const [users] = await db.promise().query('SELECT * FROM NguoiDung');
    res.json({
      total: countResult[0].total,
      users: users
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách người dùng:", error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách người dùng" });
  }
});

// API tin nhắn liên hệ từ người dùng
router.get('/admin/lienhe', async (req, res) => {
  try {
    const [contacts] = await db.promise().query('SELECT * FROM LienHe');
    res.json(contacts);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách liên hệ:", error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách liên hệ" });
  }
});
router.get("/admin/baocaobaiviet", async (req, res) => { try { const [reports] = await db.promise().query(` SELECT BaoCaoBaiViet.*, NguoiDung.HoTen AS TenNguoiDung, CongThuc.TenMonAn AS TenMonAn FROM BaoCaoBaiViet JOIN NguoiDung ON BaoCaoBaiViet.MaNguoiDung = NguoiDung.MaNguoiDung JOIN CongThuc ON BaoCaoBaiViet.MaCongThuc = CongThuc.MaCongThuc `); res.json(reports); } catch (error) { console.error("Lỗi khi lấy báo cáo bài viết:", error); res.status(500).json({ message: "Lỗi khi lấy báo cáo bài viết" }); } });
// API xóa bài viết
router.delete("/api/baiviet/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [imageRows] = await db.promise().query(
      "SELECT DuongDanAnh FROM AnhMinhHoa WHERE MaHuongDan IN (SELECT MaHuongDan FROM HuongDan WHERE MaCongThuc = ?)",
      [id]
    );

   
    const [mainImageRow] = await db.promise().query(
      "SELECT HinhAnhChinh FROM CongThuc WHERE MaCongThuc = ?",
      [id]
    );

    // Xóa các hình ảnh trong thư mục
    imageRows.forEach(row => {
      fs.unlink(row.DuongDanAnh, (err) => {
        if (err) {
          console.error(`Lỗi khi xóa tệp ${row.DuongDanAnh}:`, err);
        } else {
          console.log(`Đã xóa tệp ${row.DuongDanAnh}`);
        }
      });
    });

    // Xóa hình ảnh chính trong thư mục
    if (mainImageRow.length > 0) {
      const mainImagePath = mainImageRow[0].HinhAnhChinh;
      fs.unlink(mainImagePath, (err) => {
        if (err) {
          console.error(`Lỗi khi xóa tệp ${mainImagePath}:`, err);
        } else {
          console.log(`Đã xóa tệp ${mainImagePath}`);
        }
      });
    }

    // Xóa các bảng liên quan trước
    await db.promise().query("DELETE FROM AnhMinhHoa WHERE MaHuongDan IN (SELECT MaHuongDan FROM HuongDan WHERE MaCongThuc = ?)", [id]);
    await db.promise().query("DELETE FROM HuongDan WHERE MaCongThuc = ?", [id]);
    await db.promise().query("DELETE FROM ChiTietNguyenLieu WHERE MaCongThuc = ?", [id]);
    await db.promise().query("DELETE FROM BinhLuan WHERE MaCongThuc = ?", [id]);
    await db.promise().query("DELETE FROM YeuThich WHERE MaCongThuc = ?", [id]);

    // Xóa công thức
    const [result] = await db.promise().query("DELETE FROM CongThuc WHERE MaCongThuc = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy bài viết với ID đã cho." });
    }

    res.json({ message: "Xóa bài viết thành công." });
  } catch (error) {
    console.error("Lỗi khi xóa bài viết:", error);
    res.status(500).json({ error: "Lỗi khi xóa bài viết." });
  }
});

module.exports = router;
