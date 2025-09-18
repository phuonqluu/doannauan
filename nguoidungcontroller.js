const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const bcrypt = require('bcrypt');


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

// API Đăng Ký
router.post('/api/dangky', (req, res) => {
  const { email, account, password, name, phone } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email không được để trống!' });
  }
  if (!account) {
    return res.status(400).json({ message: 'Tên đăng nhập không được để trống!' });
  }
  if (!password) {
    return res.status(400).json({ message: 'Mật khẩu không được để trống!' });
  }
  if (!name) {
    return res.status(400).json({ message: 'Họ tên không được để trống!' });
  }
  if (!phone) {
    return res.status(400).json({ message: 'Số điện thoại không được để trống!' });
  }

  const checkQuery = 'SELECT * FROM NguoiDung WHERE Email = ? OR TaiKhoan = ? OR DienThoaiKH = ?';
  db.query(checkQuery, [email, account, phone], (err, results) => {
    if (err) {
      console.error('Lỗi khi kiểm tra account/email/điện thoại:', err);
      return res.status(500).json({ message: 'Lỗi server' });
    }

    if (results.length > 0) {
      if (results[0].Email === email) {
        return res.status(400).json({ message: 'Email đã được sử dụng!' });
      }
      if (results[0].TaiKhoan === account) {
        return res.status(400).json({ message: 'Tên đăng nhập đã được sử dụng!' });
      }
      if (results[0].DienThoaiKH === phone) {
        return res.status(400).json({ message: 'Số điện thoại đã được sử dụng!' });
      }
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error('Lỗi mã hóa mật khẩu:', err);
        return res.status(500).json({ message: 'Lỗi server khi mã hóa mật khẩu' });
      }

      const insertQuery = `INSERT INTO NguoiDung (HoTen, TaiKhoan, Email, MatKhau, DienThoaiKH) VALUES (?, ?, ?, ?, ?)`;
      db.query(insertQuery, [name, account, email, hashedPassword, phone], (err) => {
        if (err) {
          console.error('Lỗi khi thêm người dùng:', err);
          return res.status(500).json({ message: 'Lỗi server khi thêm người dùng' });
        }
        return res.status(200).json({ message: 'Đăng ký thành công' });
      });
    });
  });
});

// ----------------------------------------------------------API Đăng Nhập------------------------------------------------------//
router.post('/api/dangnhap', (req, res) => {
  const { account, password } = req.body;
  

  if (!account) {
    return res.status(400).json({ message: 'Tên đăng nhập không được để trống!' });
  }
  if (!password) {
    return res.status(400).json({ message: 'Mật khẩu không được để trống!' });
  }

  const sql = "SELECT * FROM NguoiDung WHERE TaiKhoan = ?";
  db.query(sql, [account], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).send({ message: "Tên đăng nhập không tồn tại!" });
    }

    const user = results[0];
    const isPasswordMatch = await bcrypt.compare(password, user.MatKhau);
    if (!isPasswordMatch) {
      return res.status(401).send({ message: "Sai mật khẩu!" });
    }
    req.session.user = {
      MaNguoiDung: user.MaNguoiDung,
      HoTen: user.HoTen,
      TaiKhoan: user.TaiKhoan,
      Email: user.Email,
      DiachiKH: user.DiachiKH,
      DienThoaiKH: user.DienThoaiKH,
      NgaySinh: user.NgaySinh,
      Avatar: user.Avatar,
      MoTa: user.MoTa,
      SoTheoDoi: user.SoTheoDoi,
      SoDangTheoDoi: user.SoDangTheoDoi,
      TongBaiViet: user.TongBaiViet,
    };
    
    res.send({ message: "Đăng nhập thành công!", user: { id: user.MaNguoiDung, name: user.HoTen } });
  });
});
// API Trạng Thái Đăng Nhập (cập nhật)
router.get('/api/trangthai', (req, res) => {
  if (req.session.user) {
    return res.status(200).json({
      loggedIn: true,
      user: req.session.user, // Thông tin người dùng từ session
    });
  } else {
    return res.status(401).json({
      loggedIn: false,
      message: 'Người dùng chưa đăng nhập!',
    });
  }
});



//--------------------------------------------------API Đăng Xuất----------------------------------------------
router.post('/api/dangxuat', (req, res) => {
  if (req.session.user) {
    // Xóa thông tin user trong session
    req.session.destroy((err) => {
      if (err) {
        console.error('Lỗi khi xóa session:', err);
        return res.status(500).json({ message: 'Lỗi server khi đăng xuất' });
      }
      res.clearCookie('connect.sid'); // Xóa cookie phiên (tùy thuộc vào cài đặt session của bạn)
      return res.status(200).json({ message: 'Đăng xuất thành công!' });
    });
  } else {
    return res.status(400).json({ message: 'Không có người dùng nào đăng nhập!' });
  }
});


module.exports = router;
