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

// API để gửi tin nhắn liên hệ
router.post('/api/lienhe', async (req, res) => {
  const { MaNguoiDung, TenNguoiDung, Email, NoiDung } = req.body;
  try {
    const query = 'INSERT INTO LienHe (MaNguoiDung, TenNguoiDung, Email, NoiDung, NgayLienHe) VALUES (?, ?, ?, ?, NOW())';
    await db.promise().query(query, [MaNguoiDung, TenNguoiDung, Email, NoiDung]);
    res.json({ message: 'Gửi tin nhắn liên hệ thành công' });
  } catch (error) {
    console.error("Lỗi khi gửi tin nhắn liên hệ:", error);
    res.status(500).json({ message: "Lỗi khi gửi tin nhắn liên hệ" });
  }
});

module.exports = router;
