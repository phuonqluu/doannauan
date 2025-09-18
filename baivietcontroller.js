const express = require("express");
const router = express.Router();
const mysql = require("mysql2");


const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", 
  database: "congthucnauan",
});

db.connect((err) => {
  if (err) {
    console.error("Kết nối MySQL thất bại:", err.message);
    process.exit(1);
  }
  console.log("Kết nối MySQL thành công!");
});

const executeQuery = (query, params) => {
  return new Promise((resolve, reject) => {
    db.query(query, params, (err, results) => {
      if (err) return reject(err); 
      resolve(results); 
    });
  });
};

// API lấy bài viết
router.get("/api/baiviet/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Lấy thông tin bài viết
    const baiViet = await executeQuery(
      `
      SELECT ct.*, nd.HoTen, nd.Avatar, nd.TaiKhoan
      FROM CongThuc ct
      JOIN NguoiDung nd ON ct.MaNguoiDung = nd.MaNguoiDung
      WHERE ct.MaCongThuc = ?
      `,
      [id]
    );

    // Lấy nguyên liệu
    const nguyenLieu = await executeQuery(
      `
      SELECT 
        nl.TenNguyenLieu, ctl.SoLuong
      FROM 
        ChiTietNguyenLieu ctl
      JOIN 
        NguyenLieu nl ON ctl.MaNguyenLieu = nl.MaNguyenLieu
      WHERE 
        ctl.MaCongThuc = ?
      `,
      [id]
    );

    // Lấy hướng dẫn
    const huongDan = await executeQuery(
      `
      SELECT hd.*, amh.DuongDanAnh
      FROM HuongDan hd
      LEFT JOIN AnhMinhHoa amh ON hd.MaHuongDan = amh.MaHuongDan
      WHERE hd.MaCongThuc = ?
      `,
      [id]
    );

    if (!baiViet.length) {
      return res.status(404).json({ error: "Không tìm thấy bài viết" });
    }

    // Trả về dữ liệu
    res.json({ baiViet: baiViet[0], nguyenLieu, huongDan });
  } catch (err) {
    console.error("Lỗi trong quá trình lấy dữ liệu:", err.message);
    res.status(500).json({ error: "Không thể lấy dữ liệu bài viết" });
  }
});

module.exports = router;
