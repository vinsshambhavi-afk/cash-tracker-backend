const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());
app.use(cors());

// 1. Connect to MongoDB Atlas
const MONGO_URI = "mongodb+srv://vinsshambhavi:vinsadmin@cluster0.mongodb.net/vinsnetbill?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB Successfully"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// 2. Schemas & Models
const CashSchema = new mongoose.Schema({
  receiptNo: String,
  subscriber: String,
  amount: Number,
  paymentMethod: String,
  date: { type: Date, default: Date.now }
});
const CashRecord = mongoose.model('CashRecord', CashSchema);

// OTP Schema for SMS Login
const OtpSchema = new mongoose.Schema({
  mobile: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // Expires in 5 mins
});
const OTPModel = mongoose.model('OTP', OtpSchema);

// User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, default: "Vins Admin" },
  mobile: { type: String, unique: true, default: "+91 8147422496" },
  role: { type: String, default: "Admin Master" }
});
const UserModel = mongoose.model('User', UserSchema);

// 3. SMS OTP Authentication Routes
app.post('/api/auth/send-otp', async (req, res) => {
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ success: false, message: "Mobile number required" });

  // Generate 6 digit OTP (Hardcoded demo OTP '123456' for +91 8147422496 for quick access)
  const otp = (mobile === "+91 8147422496") ? "123456" : Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await OTPModel.deleteMany({ mobile });
    await OTPModel.create({ mobile, otp });
    console.log(`[SMS Gateway] Sent OTP ${otp} to ${mobile}`);
    res.json({ success: true, message: `OTP sent successfully to ${mobile}`, demoOtp: otp });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error generating OTP", error });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { mobile, otp } = req.body;
  try {
    const validOtp = await OTPModel.findOne({ mobile, otp });
    if (!validOtp) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    let user = await UserModel.findOne({ mobile });
    if (!user) {
      user = await UserModel.create({ name: "Vins Admin", mobile, role: "Admin Master" });
    }

    await OTPModel.deleteOne({ _id: validOtp._id });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Verification failed", error });
  }
});

// 4. Cash Records Routes
app.get('/api/cash-records', async (req, res) => {
  try {
    const records = await CashRecord.find().sort({ date: -1 });
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/cash-records', async (req, res) => {
  try {
    const newRecord = new CashRecord(req.body);
    await newRecord.save();
    res.json({ success: true, record: newRecord });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
