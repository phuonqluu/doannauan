const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");


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
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage: storage });

// API thêm món ăn
router.post(
  "/api/themmon",
  upload.any(), 
  (req, res) => {
    const { tenMonAn, moTa, maNguoiDung, nguyenLieu, buocHuongDan } = req.body;
    const hinhAnhChinh = req.files.find(file => file.fieldname === "image") 
      ? "uploads/baiviet/" + req.files.find(file => file.fieldname === "image").filename
      : ""; 
    const nguyenLieuArray = JSON.parse(nguyenLieu); 
    const buocHuongDanArray = JSON.parse(buocHuongDan);

    // Thực hiện truy vấn SQL để thêm món ăn vào cơ sở dữ liệu
    const query =
      "INSERT INTO CongThuc (TenMonAn, MoTa, HinhAnhChinh, MaNguoiDung) VALUES (?, ?, ?, ?)";
    db.execute(
      query,
      [tenMonAn, moTa, hinhAnhChinh, maNguoiDung],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Lỗi khi thêm món ăn" });
        }

        const maCongThuc = result.insertId; 
        // Thêm nguyên liệu
        let promises = [];
        nguyenLieuArray.forEach((item) => {
          const checkNguyenLieuQuery =
            "SELECT MaNguyenLieu FROM NguyenLieu WHERE TenNguyenLieu = ?";
          promises.push(
            new Promise((resolve, reject) => {
              db.execute(
                checkNguyenLieuQuery,
                [item.tenNguyenLieu],
                (err, rows) => {
                  if (err) {
                    return reject(err);
                  }

                  let nguyenLieuId =
                    rows.length > 0 ? rows[0].MaNguyenLieu : null;

                  if (!nguyenLieuId) {
                    const insertNguyenLieuQuery =
                      "INSERT INTO NguyenLieu (TenNguyenLieu) VALUES (?)";
                    db.execute(
                      insertNguyenLieuQuery,
                      [item.tenNguyenLieu],
                      (err, result) => {
                        if (err) {
                          return reject(err);
                        }
                        nguyenLieuId = result.insertId;
                        const insertChiTietNguyenLieuQuery =
                          "INSERT INTO ChiTietNguyenLieu (MaCongThuc, MaNguyenLieu, SoLuong) VALUES (?, ?, ?)";
                        db.execute(
                          insertChiTietNguyenLieuQuery,
                          [maCongThuc, nguyenLieuId, item.soLuong],
                          (err) => {
                            if (err) {
                              return reject(err);
                            }
                            resolve();
                          }
                        );
                      }
                    );
                  } else {
                    const insertChiTietNguyenLieuQuery =
                      "INSERT INTO ChiTietNguyenLieu (MaCongThuc, MaNguyenLieu, SoLuong) VALUES (?, ?, ?)";
                    db.execute(
                      insertChiTietNguyenLieuQuery,
                      [maCongThuc, nguyenLieuId, item.soLuong],
                      (err) => {
                        if (err) {
                          return reject(err);
                        }
                        resolve();
                      }
                    );
                  }
                }
              );
            })
          );
        });

        let buocPromises = [];
        let maHuongDanList = []; // Danh sách để lưu MaHuongDan
        // Thêm các bước hướng dẫn
        buocHuongDanArray.forEach((item, index) => {
          const insertHuongDanQuery =
            "INSERT INTO HuongDan (MaCongThuc, BuocSo, MoTaBuoc) VALUES (?, ?, ?)";
          buocPromises.push(
            new Promise((resolve, reject) => {
              db.execute(
                insertHuongDanQuery,
                [maCongThuc, index + 1, item],
                (err, result) => {
                  if (err) {
                    return reject(err);
                  }
                  maHuongDanList.push(result.insertId);
                  resolve();
                }
              );
            })
          );
        });
        Promise.all(buocPromises)
          .then(() => {
            // Sau khi thêm các bước, thêm ảnh cho từng bước
            let imagePromises = [];
            if (req.files) {
              req.files.forEach((file) => {
                const match = file.fieldname.match(/buocImages_(\d+)_(\d+)/);
                if (match) {
                  const stepIndex = parseInt(match[1]);
                  if (maHuongDanList[stepIndex]) {
                    const insertAnhMinhHoaQuery =
                      "INSERT INTO AnhMinhHoa (MaHuongDan, DuongDanAnh) VALUES (?, ?)";
                    imagePromises.push(
                      new Promise((resolve, reject) => {
                        db.execute(
                          insertAnhMinhHoaQuery,
                          [
                            maHuongDanList[stepIndex],
                            "uploads/baiviet/" + file.filename,
                          ],
                          (err) => {
                            if (err) {
                              return reject(err);
                            }
                            resolve();
                          }
                        );
                      })
                    );
                  }
                }
              });
            }
            // Chờ tất cả ảnh được thêm vào
            return Promise.all(imagePromises);
          })
          .then(() => {
            res.status(200).json({
              message: "Món ăn đã được thêm thành công",
              idCongThuc: maCongThuc,
            });
          })
          .catch((error) => {
            console.error(error);
            res.status(500).json({ message: "Lỗi khi thêm nguyên liệu hoặc hướng dẫn" });
          });
      }
    );
  }
);

module.exports = router;
