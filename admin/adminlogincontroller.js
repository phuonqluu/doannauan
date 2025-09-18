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


router.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } 
}));

// API Đăng Nhập cho QuanTriVien
router.post('/admin/dangnhap', (req, res) => {
  const { username, password } = req.body;


  if (!username) {
    return res.status(400).json({ message: 'Tên đăng nhập không được để trống!' });
  }
  if (!password) {
    return res.status(400).json({ message: 'Mật khẩu không được để trống!' });
  }

  const sql = "SELECT * FROM QuanTriVien WHERE TenDangNhap = ? AND MatKhau = ?";
  db.query(sql, [username, password], (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).send({ message: "Tên đăng nhập hoặc mật khẩu không đúng!" });
    }

    const admin = results[0];
    
    req.session.admin = {
      TenDangNhap: admin.TenDangNhap,
      HoTen: admin.HoTen
    };
    
    res.send({ message: "Đăng nhập thành công!", admin: { username: admin.TenDangNhap, name: admin.HoTen } });
  });
});

// API Trạng Thái Đăng Nhập
router.get('/admin/trangthai', (req, res) => {
  if (req.session.admin) {
    return res.status(200).json({
      loggedIn: true,
      admin: req.session.admin, 
    });
  } else {
    return res.status(401).json({
      loggedIn: false,
      message: 'Quản trị viên chưa đăng nhập!',
    });
  }
});

// API Đăng Xuất cho QuanTriVien
router.post('/admin/dangxuat', (req, res) => {
  if (req.session.admin) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Lỗi khi xóa session:', err);
        return res.status(500).json({ message: 'Lỗi server khi đăng xuất' });
      }
      res.clearCookie('connect.sid');
      return res.status(200).json({ message: 'Đăng xuất thành công!' });
    });
  } else {
    return res.status(400).json({ message: 'Không có quản trị viên nào đăng nhập!' });
  }
});

module.exports = router;
