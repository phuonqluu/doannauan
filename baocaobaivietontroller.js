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
  if (err) throw err;
  console.log("Kết nối MySQL thành công!");
});

// API để báo cáo bài viết
router.post("/api/baocaobaiviet", async (req, res) => {
  const { MaCongThuc, MaNguoiDung, LyDo } = req.body;
  try {
    const query = "INSERT INTO BaoCaoBaiViet (MaCongThuc, MaNguoiDung, LyDo, NgayBaoCao) VALUES (?, ?, ?, NOW())";
    await db.promise().query(query, [MaCongThuc, MaNguoiDung, LyDo]);
    res.json({ message: "Báo cáo bài viết thành công." });
  } catch (error) {
    console.error("Lỗi khi báo cáo bài viết:", error);
    res.status(500).json({ error: "Lỗi khi báo cáo bài viết." });
  }
});

module.exports = router;
