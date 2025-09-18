const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "congthucnauan",
});


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/baiviet");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    cb(null, true); 
  }
}).any(); 

// API xóa ảnh
router.delete("/api/xoa-anh/:id", async (req, res) => {
  const { id } = req.params;

  const connection = db.promise();

  try {
    const [result] = await connection.query("SELECT DuongDanAnh FROM AnhMinhHoa WHERE MaAnh = ?", [id]);
    if (result.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy ảnh" });
    }
    const imagePath = result[0].DuongDanAnh;


    await connection.query("DELETE FROM AnhMinhHoa WHERE MaAnh = ?", [id]);
    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error("Lỗi khi xóa ảnh:", err);
        } else {
          console.log("Ảnh đã được xóa:", imagePath);
        }
      });
    }

    res.status(200).json({ message: "Ảnh đã được xóa thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa ảnh:", error);
    res.status(500).json({ message: "Lỗi khi xóa ảnh", error });
  }
});

// API cập nhật thông tin món ăn và hướng dẫn
router.put("/api/suabaiviet/:id", upload, async (req, res) => {
  const { id } = req.params;
  const { tenMonAn, moTa, nguyenLieu, huongDan } = req.body;
  const hinhAnhChinh = req.files.find(file => file.fieldname === "image") ? "uploads/baiviet/" + req.files.find(file => file.fieldname === "image").filename : null;

  let nguyenLieuArray;
  try {
    nguyenLieuArray = JSON.parse(nguyenLieu);
  } catch (error) {
    console.error("Lỗi khi phân tích nguyên liệu:", error);
    return res.status(400).json({ message: "Dữ liệu nguyên liệu không hợp lệ" });
  }

  let huongDanArray;
  try {
    huongDanArray = JSON.parse(huongDan);
  } catch (error) {
    console.error("Lỗi khi phân tích hướng dẫn:", error);
    return res.status(400).json({ message: "Dữ liệu hướng dẫn không hợp lệ" });
  }

  const connection = db.promise();
  await connection.beginTransaction();

  try {
    const [results] = await connection.query("SELECT * FROM CongThuc WHERE MaCongThuc = ?", [id]);
    if (results.length === 0) {
      console.log("Không tìm thấy món ăn:", id);
      return res.status(404).json({ message: "Không tìm thấy món ăn" });
    }
    const congThuc = results[0];
    const oldImagePath = congThuc.HinhAnhChinh;

    await connection.query(
      "UPDATE CongThuc SET TenMonAn = ?, MoTa = ?, HinhAnhChinh = ? WHERE MaCongThuc = ?",
      [tenMonAn, moTa, hinhAnhChinh || congThuc.HinhAnhChinh, id]
    );

    if (nguyenLieuArray && Array.isArray(nguyenLieuArray)) {
      await connection.query("DELETE FROM ChiTietNguyenLieu WHERE MaCongThuc = ?", [id]);

      for (const nl of nguyenLieuArray) {
        let [nguyenLieuResult] = await connection.query("SELECT MaNguyenLieu FROM NguyenLieu WHERE TenNguyenLieu = ?", [nl.TenNguyenLieu]);
        if (nguyenLieuResult.length === 0) {
          const [insertResult] = await connection.query("INSERT INTO NguyenLieu (TenNguyenLieu) VALUES (?)", [nl.TenNguyenLieu]);
          nl.MaNguyenLieu = insertResult.insertId;
        } else {
          nl.MaNguyenLieu = nguyenLieuResult[0].MaNguyenLieu;
        }

        await connection.query(
          "INSERT INTO ChiTietNguyenLieu (MaCongThuc, MaNguyenLieu, SoLuong) VALUES (?, ?, ?)",
          [id, nl.MaNguyenLieu, nl.SoLuong]
        );
      }
    }

    if (huongDanArray && Array.isArray(huongDanArray)) {
      for (const hd of huongDanArray) {
        if (hd.MaHuongDan) {
          await connection.query("UPDATE HuongDan SET MoTaBuoc = ? WHERE MaHuongDan = ?", [hd.MoTaBuoc, hd.MaHuongDan]);
        } else {
          const [insertResult] = await connection.query("INSERT INTO HuongDan (MaCongThuc, BuocSo, MoTaBuoc) VALUES (?, ?, ?)", [id, hd.BuocSo, hd.MoTaBuoc]);
          hd.MaHuongDan = insertResult.insertId;
        }

        if (hd.AnhMinhHoa && Array.isArray(hd.AnhMinhHoa)) {
          for (let i = 0; i < hd.AnhMinhHoa.length; i++) {
            const anh = hd.AnhMinhHoa[i];
            const file = req.files.find(file => file.fieldname === `huongDan_${hd.MaHuongDan}_anh_${i}`);
            if (file) {
              const filePath = "uploads/baiviet/" + file.filename;
              if (anh.MaAnh) {
                // Xóa ảnh cũ nếu tồn tại
                const [oldImage] = await connection.query("SELECT DuongDanAnh FROM AnhMinhHoa WHERE MaAnh = ?", [anh.MaAnh]);
                const oldPath = oldImage[0].DuongDanAnh;
                if (oldPath && fs.existsSync(oldPath)) {
                  fs.unlink(oldPath, (err) => {
                    if (err) {
                      console.error("Lỗi khi xóa ảnh cũ:", err);
                    } else {
                      console.log("Ảnh cũ đã được xóa:", oldPath);
                    }
                  });
                }
                // Cập nhật ảnh hiện có
                await connection.query("UPDATE AnhMinhHoa SET DuongDanAnh = ? WHERE MaAnh = ?", [filePath, anh.MaAnh]);
              } else {
                // Thêm ảnh mới
                await connection.query("INSERT INTO AnhMinhHoa (MaHuongDan, DuongDanAnh) VALUES (?, ?)", [hd.MaHuongDan, filePath]);
              }
            }

            // Xóa ảnh cũ nếu được đánh dấu để xóa
            if (anh.toBeDeleted && anh.MaAnh) {
              const [oldImage] = await connection.query("SELECT DuongDanAnh FROM AnhMinhHoa WHERE MaAnh = ?", [anh.MaAnh]);
              const oldPath = oldImage[0].DuongDanAnh;
              await connection.query("DELETE FROM AnhMinhHoa WHERE MaAnh = ?", [anh.MaAnh]);
              if (oldPath && fs.existsSync(oldPath)) {
                fs.unlink(oldPath, (err) => {
                  if (err) {
                    console.error("Lỗi khi xóa ảnh cũ:", err);
                  } else {
                    console.log("Ảnh cũ đã được xóa:", oldPath);
                  }
                });
              }
            }
          }
        }
      }
    }

    if (hinhAnhChinh && oldImagePath && fs.existsSync(oldImagePath)) {
      fs.unlink(oldImagePath, (err) => {
        if (err) {
          console.error("Lỗi khi xóa ảnh cũ:", err);
        } else {
          console.log("Ảnh cũ đã được xóa:", oldImagePath);
        }
      });
    }

    await connection.commit();
    res.status(200).json({ message: "Thông tin món ăn đã được cập nhật thành công" });
  } catch (error) {
    await connection.rollback();
    console.error("Lỗi khi cập nhật món ăn:", error);
    res.status(500).json({ message: "Lỗi khi cập nhật món ăn", error });
  }
});

module.exports = router;

