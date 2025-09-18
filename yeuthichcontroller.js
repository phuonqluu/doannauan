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
  console.log('Kết nối MySQL thành công!');
});

// API kiểm tra xem công thức đã được lưu hay chưa
router.get("/api/kiemtra-yeuthich/:maNguoiDung/:maCongThuc", (req, res) => {
  const { maNguoiDung, maCongThuc } = req.params;

  const query = "SELECT * FROM YeuThich WHERE MaNguoiDung = ? AND MaCongThuc = ?";
  db.execute(query, [maNguoiDung, maCongThuc], (err, results) => {
    if (err) {
      console.error("Lỗi khi kiểm tra yêu thích:", err);
      return res.status(500).json({ message: "Lỗi khi kiểm tra yêu thích" });
    }
    const isSaved = results.length > 0;
    res.status(200).json({ isSaved });
  });
});

// API thêm yêu thích công thức
router.post("/api/themyeuthich", (req, res) => {
  const { maNguoiDung, maCongThuc } = req.body;

  const query = "INSERT INTO YeuThich (MaNguoiDung, MaCongThuc, NgayLuu) VALUES (?, ?, NOW())";
  db.execute(query, [maNguoiDung, maCongThuc], (err, result) => {
    if (err) {
      console.error("Lỗi khi thêm yêu thích:", err);
      return res.status(500).json({ message: "Lỗi khi thêm yêu thích" });
    }
    res.status(200).json({ message: "Đã thêm yêu thích thành công" });
  });
});

// API hủy lưu công thức
router.delete("/api/huyyeuthich", (req, res) => {
  const { maNguoiDung, maCongThuc } = req.body;

  const query = "DELETE FROM YeuThich WHERE MaNguoiDung = ? AND MaCongThuc = ?";
  db.execute(query, [maNguoiDung, maCongThuc], (err, result) => {
    if (err) {
      console.error("Lỗi khi hủy yêu thích:", err);
      return res.status(500).json({ message: "Lỗi khi hủy yêu thích" });
    }
    res.status(200).json({ message: "Đã hủy yêu thích thành công" });
  });
});

// API lấy các món đã lưu của người dùng
router.get("/api/monluu/:maNguoiDung", async (req, res) => {
  const { maNguoiDung } = req.params;
  try {
    const query = `
      SELECT ct.*, GROUP_CONCAT(nl.TenNguyenLieu SEPARATOR ', ') AS TenNguyenLieu, nd.HoTen, nd.Avatar
      FROM YeuThich yt
      INNER JOIN CongThuc ct ON yt.MaCongThuc = ct.MaCongThuc
      LEFT JOIN ChiTietNguyenLieu ctnl ON ct.MaCongThuc = ctnl.MaCongThuc
      LEFT JOIN NguyenLieu nl ON ctnl.MaNguyenLieu = nl.MaNguyenLieu
      LEFT JOIN NguoiDung nd ON ct.MaNguoiDung = nd.MaNguoiDung
      WHERE yt.MaNguoiDung = ?
      GROUP BY ct.MaCongThuc
    `;
    const [rows] = await db.promise().query(query, [maNguoiDung]);
    res.json(rows);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách món đã lưu:", error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách món đã lưu" });
  }
});


// API lấy tất cả các món ăn của người dùng bao gồm cả món của bạn và món yêu thích
router.get("/api/tatca/:maNguoiDung", async (req, res) => {
  const { maNguoiDung } = req.params;
  try {
    const query = `
      SELECT 
        'CongThuc' AS Loai,
        ct.MaCongThuc,
        ct.TenMonAn,
        ct.MoTa AS MoTaCongThuc,
        ct.HinhAnhChinh,
        ct.NgayDang,
        NULL AS NgayLuu,
        nd.HoTen,
        nd.Avatar
      FROM 
        CongThuc ct
      JOIN 
        NguoiDung nd ON ct.MaNguoiDung = nd.MaNguoiDung
      WHERE 
        ct.MaNguoiDung = ?
      
      UNION ALL
      
      SELECT 
        'YeuThich' AS Loai,
        ct.MaCongThuc,
        ct.TenMonAn,
        ct.MoTa AS MoTaCongThuc,
        ct.HinhAnhChinh,
        ct.NgayDang,
        yt.NgayLuu,
        nd.HoTen,
        nd.Avatar
      FROM 
        CongThuc ct
      JOIN 
        YeuThich yt ON ct.MaCongThuc = yt.MaCongThuc
      JOIN 
        NguoiDung nd ON ct.MaNguoiDung = nd.MaNguoiDung
      WHERE 
        yt.MaNguoiDung = ?
    `;
    const [rows] = await db.promise().query(query, [maNguoiDung, maNguoiDung]);
    res.json(rows);
  } catch (error) {
    console.error("Lỗi khi lấy tất cả các món ăn:", error);
    res.status(500).json({ message: "Lỗi khi lấy tất cả các món ăn" });
  }
});


module.exports = router;
