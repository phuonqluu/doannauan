const express = require('express');
const router = express.Router();
const mysql = require('mysql2');

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

// API tìm kiếm món ăn
router.get("/api/timkiem", async (req, res) => {
  const { keyword } = req.query;
  try {
    const query = `
      SELECT ct.*, GROUP_CONCAT(nl.TenNguyenLieu SEPARATOR ', ') AS TenNguyenLieu, nd.HoTen, nd.Avatar
      FROM CongThuc ct
      LEFT JOIN ChiTietNguyenLieu ctnl ON ct.MaCongThuc = ctnl.MaCongThuc
      LEFT JOIN NguyenLieu nl ON ctnl.MaNguyenLieu = nl.MaNguyenLieu
      LEFT JOIN NguoiDung nd ON ct.MaNguoiDung = nd.MaNguoiDung
      WHERE ct.TenMonAn REGEXP ? OR ct.MoTa REGEXP ? OR nl.TenNguyenLieu REGEXP ?
      GROUP BY ct.MaCongThuc
    `;
    const [rows] = await db.promise().query(query, [`\\b${keyword}\\b`, `\\b${keyword}\\b`, `\\b${keyword}\\b`]);
    res.json(rows);
  } catch (error) {
    console.error("Lỗi khi tìm kiếm món ăn:", error);
    res.status(500).json({ message: "Lỗi khi tìm kiếm món ăn" });
  }
});

module.exports = router;
