const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', 
  database: 'congthucnauan'
});

db.connect((err) => {
  if (err) throw err;
  console.log('Kết nối MySQL thành công!');
});

// Xóa bài viết và các bảng liên quan
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
