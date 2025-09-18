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

// API thêm theo dõi
router.post("/api/theodoi", async (req, res) => {
  const { NguoiTheoDoi, NguoiDuocTheoDoi } = req.body;
  try {
    const insertQuery = `
      INSERT INTO TheoDoi (NguoiTheoDoi, NguoiDuocTheoDoi) 
      VALUES (?, ?)
    `;
    await db.promise().query(insertQuery, [NguoiTheoDoi, NguoiDuocTheoDoi]);
    const updateQuery1 = `
      UPDATE NguoiDung 
      SET SoDangTheoDoi = SoDangTheoDoi + 1 
      WHERE MaNguoiDung = ?
    `;
    await db.promise().query(updateQuery1, [NguoiTheoDoi]);

    const updateQuery2 = `
      UPDATE NguoiDung 
      SET SoTheoDoi = SoTheoDoi + 1 
      WHERE MaNguoiDung = ?
    `;
    await db.promise().query(updateQuery2, [NguoiDuocTheoDoi]);

    res.json({ message: "Đã theo dõi thành công!" });
  } catch (error) {
    console.error("Lỗi khi theo dõi:", error);
    res.status(500).json({ message: "Lỗi khi theo dõi" });
  }
});

// API hủy theo dõi
router.delete("/api/huytheodoi", async (req, res) => {
  const { NguoiTheoDoi, NguoiDuocTheoDoi } = req.body;
  try {
    const deleteQuery = `
      DELETE FROM TheoDoi 
      WHERE NguoiTheoDoi = ? AND NguoiDuocTheoDoi = ?
    `;
    await db.promise().query(deleteQuery, [NguoiTheoDoi, NguoiDuocTheoDoi]);
    const updateQuery1 = `
      UPDATE NguoiDung 
      SET SoDangTheoDoi = SoDangTheoDoi - 1 
      WHERE MaNguoiDung = ?
    `;
    await db.promise().query(updateQuery1, [NguoiTheoDoi]);

    const updateQuery2 = `
      UPDATE NguoiDung 
      SET SoTheoDoi = SoTheoDoi - 1 
      WHERE MaNguoiDung = ?
    `;
    await db.promise().query(updateQuery2, [NguoiDuocTheoDoi]);

    res.json({ message: "Đã hủy theo dõi thành công!" });
  } catch (error) {
    console.error("Lỗi khi hủy theo dõi:", error);
    res.status(500).json({ message: "Lỗi khi hủy theo dõi" });
  }
});

// API kiểm tra trạng thái theo dõi
router.get("/api/kiemtratheodoi/:NguoiTheoDoi/:NguoiDuocTheoDoi", async (req, res) => {
  const { NguoiTheoDoi, NguoiDuocTheoDoi } = req.params;
  try {
    const query = `
      SELECT * FROM TheoDoi 
      WHERE NguoiTheoDoi = ? AND NguoiDuocTheoDoi = ?
    `;
    const [rows] = await db.promise().query(query, [NguoiTheoDoi, NguoiDuocTheoDoi]);
    const isFollowing = rows.length > 0;
    res.json({ isFollowing });
  } catch (error) {
    console.error("Lỗi khi kiểm tra trạng thái theo dõi:", error);
    res.status(500).json({ message: "Lỗi khi kiểm tra trạng thái theo dõi" });
  }
});

// API lấy danh sách người theo dõi
router.get("/api/nguoiduoctheodoi/:maNguoiDung", async (req, res) => {
    const { maNguoiDung } = req.params;
    try {
      const query = `
        SELECT nd.MaNguoiDung, nd.HoTen, nd.TaiKhoan, nd.Avatar, COUNT(ct.MaCongThuc) AS SoMon
        FROM TheoDoi td
        JOIN NguoiDung nd ON td.NguoiTheoDoi = nd.MaNguoiDung
        LEFT JOIN CongThuc ct ON nd.MaNguoiDung = ct.MaNguoiDung
        WHERE td.NguoiDuocTheoDoi = ?
        GROUP BY nd.MaNguoiDung, nd.HoTen, nd.TaiKhoan, nd.Avatar
      `;
      const [rows] = await db.promise().query(query, [maNguoiDung]);
      res.json(rows);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách người theo dõi:", error);
      res.status(500).json({ message: "Lỗi khi lấy danh sách người theo dõi" });
    }
  });
// API lấy danh sách người được theo dõi
router.get("/api/nguoitheodoi/:maNguoiDung", async (req, res) => {
    const { maNguoiDung } = req.params;
    try {
      const query = `
        SELECT nd.MaNguoiDung, nd.HoTen, nd.TaiKhoan, nd.Avatar, COUNT(ct.MaCongThuc) AS SoMon
        FROM TheoDoi td
        JOIN NguoiDung nd ON td.NguoiDuocTheoDoi = nd.MaNguoiDung
        LEFT JOIN CongThuc ct ON nd.MaNguoiDung = ct.MaNguoiDung
        WHERE td.NguoiTheoDoi = ?
        GROUP BY nd.MaNguoiDung, nd.HoTen, nd.TaiKhoan, nd.Avatar
      `;
      const [rows] = await db.promise().query(query, [maNguoiDung]);
      res.json(rows);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách người được theo dõi:", error);
      res.status(500).json({ message: "Lỗi khi lấy danh sách người được theo dõi" });
    }
  });
    

module.exports = router;
