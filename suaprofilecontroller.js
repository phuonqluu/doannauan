const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', 
  database: 'congthucnauan',
});

db.connect((err) => { 
  if (err) throw err;
  console.log('Kết nối MySQL thành công!');
});

// Cấu hình lưu ảnh tải lên
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)); 
  },
});

const upload = multer({ storage: storage });

// API upload avatar
router.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
  if (req.session.user) {
    const userId = req.session.user.MaNguoiDung;
    const avatarPath = req.file.path; 
    
    // Kiểm tra và xóa ảnh cũ
    if (req.session.user.Avatar) {
      const oldAvatarPath = req.session.user.Avatar.replace('http://localhost:3001/', '');
      fs.unlink(oldAvatarPath, (err) => {
        if (err) {
          console.error("Lỗi khi xóa ảnh cũ:", err);
        }
      });
    }

    const sql = 'UPDATE NguoiDung SET Avatar = ? WHERE MaNguoiDung = ?';
    db.query(sql, [avatarPath, userId], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Có lỗi khi cập nhật ảnh đại diện.' });
      }
      req.session.user.Avatar = avatarPath;
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ message: 'Có lỗi khi cập nhật session.' });
        }
        res.status(200).json({ message: 'Tải ảnh thành công!', avatar: `http://localhost:3001/${avatarPath}` });
      });
    });
  } else {
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }
});

router.delete('/api/delete-avatar', (req, res) => {
  if (req.session.user) {
    const userId = req.session.user.MaNguoiDung;

    const avatarPath = req.session.user.Avatar?.replace('http://localhost:3001/', '');
    if (!avatarPath) {
      return res.status(400).json({ message: 'Không có ảnh để xóa.' });
    }

    fs.unlink(avatarPath, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Có lỗi khi xóa ảnh' });
      }
      const sql = 'UPDATE NguoiDung SET Avatar = NULL WHERE MaNguoiDung = ?';
      db.query(sql, [userId], (err, result) => {
        if (err) {
          return res.status(500).json({ message: 'Có lỗi khi xóa avatar trong database.' });
        }
        req.session.user.Avatar = null;

        res.status(200).json({ message: 'Xóa ảnh thành công!' });
      });
    });
  } else {
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }
});






// API lấy thông tin người dùng
router.get('/api/thongtinnguoidung', (req, res) => {
  if (req.session.user) {
    const userId = req.session.user.MaNguoiDung;
    const sql = 'SELECT * FROM NguoiDung WHERE MaNguoiDung = ?';
    db.query(sql, [userId], (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ message: 'Người dùng không tồn tại' });
      }
      const user = results[0];
      user.Avatar = user.Avatar ? `http://localhost:3001/${user.Avatar}` : null;
      return res.status(200).json({ user });
    });
  } else {
    return res.status(401).json({ message: 'Chưa đăng nhập' });
  }
});



// API cập nhật thông tin người dùng
router.put('/api/capnhatthongtin', (req, res) => {
  const { HoTen, Email, DiachiKH, MoTa } = req.body;
  const userId = req.session.user.MaNguoiDung;  
  const sql = 'UPDATE NguoiDung SET HoTen = ?, Email = ?, DiachiKH = ?, MoTa = ? WHERE MaNguoiDung = ?';
  db.query(sql, [HoTen, Email, DiachiKH, MoTa, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Có lỗi xảy ra khi cập nhật thông tin.' });
    }
    req.session.user.HoTen = HoTen;
    req.session.user.Email = Email;
    req.session.user.DiachiKH = DiachiKH;
    req.session.user.MoTa = MoTa;

    return res.status(200).json({ message: 'Cập nhật thông tin thành công!' });
  });
});


module.exports = router;
