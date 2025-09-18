const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const session = require('express-session');


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

// API lấy thông tin chi tiết người dùng
router.get("/api/nguoidung/:id", async (req, res) => {
  const { id } = req.params;
  try {
    console.log("Received request for user ID:", id);

    const [userResult] = await db.promise().query("SELECT * FROM NguoiDung WHERE MaNguoiDung = ?", [id]);
    console.log("User result:", userResult);

    const [userPostsResult] = await db.promise().query("SELECT * FROM CongThuc WHERE MaNguoiDung = ?", [id]);
    console.log("User posts result:", userPostsResult);

    const [userCommentsResult] = await db.promise().query("SELECT * FROM BinhLuan WHERE MaNguoiDung = ?", [id]);
    console.log("User comments result:", userCommentsResult);

    const [userReportsResult] = await db.promise().query(`
      SELECT BaoCaoBaiViet.*, CongThuc.TenMonAn
      FROM BaoCaoBaiViet
      JOIN CongThuc ON BaoCaoBaiViet.MaCongThuc = CongThuc.MaCongThuc
      WHERE BaoCaoBaiViet.MaNguoiDung = ?
    `, [id]);
    console.log("User reports result:", userReportsResult);

    const [userContactsResult] = await db.promise().query("SELECT * FROM LienHe WHERE MaNguoiDung = ?", [id]);
    console.log("User contacts result:", userContactsResult);

    if (userResult.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy người dùng với ID đã cho." });
    }

    const user = userResult[0];
    const userPosts = userPostsResult;
    const userComments = userCommentsResult;
    const userReports = userReportsResult;
    const userContacts = userContactsResult;

    res.json({
      user,
      userPosts,
      userComments,
      userReports,
      userContacts
    });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu người dùng:", error);
    res.status(500).json({ message: "Lỗi khi lấy dữ liệu người dùng" });
  }
});

module.exports = router;
