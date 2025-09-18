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

// API quản lý bình luận
router.get('/api/binhluan/:maCongThuc', async (req, res) => {
  const { maCongThuc } = req.params;
  try {
    const [comments] = await db.promise().query('SELECT bl.*, nd.HoTen, nd.Avatar FROM BinhLuan bl JOIN NguoiDung nd ON bl.MaNguoiDung = nd.MaNguoiDung WHERE bl.MaCongThuc = ?', [maCongThuc]);
    res.json(comments);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bình luận:", error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách bình luận" });
  }
});

router.post('/api/binhluan', async (req, res) => {
  const { MaCongThuc, MaNguoiDung, NoiDung } = req.body;
  try {
    const query = 'INSERT INTO BinhLuan (MaCongThuc, MaNguoiDung, NoiDung) VALUES (?, ?, ?)';
    const [result] = await db.promise().query(query, [MaCongThuc, MaNguoiDung, NoiDung]);
    const [chuBaiViet] = await db.promise().query('SELECT MaNguoiDung FROM CongThuc WHERE MaCongThuc = ?', [MaCongThuc]);
    const MaChuBaiViet = chuBaiViet[0].MaNguoiDung;

    const thongBaoQuery = 'INSERT INTO ThongBao (MaNguoiDung, MaCongThuc, NoiDung) VALUES (?, ?, ?)';
    const thongBaoNoiDung = ` đã bình luận bài viết của bạn.`;
    await db.promise().query(thongBaoQuery, [MaChuBaiViet, MaCongThuc, thongBaoNoiDung]);

    res.json({ message: 'Thêm bình luận thành công', MaBinhLuan: result.insertId });
  } catch (error) {
    console.error("Lỗi khi thêm bình luận:", error);
    res.status(500).json({ message: "Lỗi khi thêm bình luận" });
  }
});

router.get('/api/thongbao/:maNguoiDung', async (req, res) => {
    const { maNguoiDung } = req.params;
    try {
      const [thongBao] = await db.promise().query(`
        SELECT 
            tb.ThoiGian,
            tb.MaCongThuc,
            tb.NoiDung,
            ct.TenMonAn AS TenCongThuc
        FROM 
            ThongBao tb
        JOIN 
            CongThuc ct ON tb.MaCongThuc = ct.MaCongThuc
        WHERE 
            ct.MaNguoiDung = ?
        ORDER BY 
            tb.ThoiGian DESC
      `, [maNguoiDung]);
      res.json(thongBao);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách thông báo:", error);
      res.status(500).json({ message: "Lỗi khi lấy danh sách thông báo" });
    }
  });
  

router.put('/api/binhluan/:id', async (req, res) => {
  const { id } = req.params;
  const { NoiDung } = req.body;
  try {
    const query = 'UPDATE BinhLuan SET NoiDung = ? WHERE MaBinhLuan = ?';
    await db.promise().query(query, [NoiDung, id]);
    res.json({ message: 'Cập nhật bình luận thành công' });
  } catch (error) {
    console.error("Lỗi khi cập nhật bình luận:", error);
    res.status(500).json({ message: "Lỗi khi cập nhật bình luận" });
  }
});

router.delete('/api/binhluan/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.promise().query('DELETE FROM ThongBao WHERE MaCongThuc = (SELECT MaCongThuc FROM BinhLuan WHERE MaBinhLuan = ?)', [id]);

    await db.promise().query('DELETE FROM BinhLuan WHERE MaBinhLuan = ?', [id]);
    res.json({ message: 'Xóa bình luận và thông báo thành công' });
  } catch (error) {
    console.error("Lỗi khi xóa bình luận và thông báo:", error);
    res.status(500).json({ message: "Lỗi khi xóa bình luận và thông báo" });
  }
});

module.exports = router;
