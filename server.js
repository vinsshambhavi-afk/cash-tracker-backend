```js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'running',
    app: 'VINS Bills Backend',
    message: 'Backend server is online'
  });
});

// Health route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    database: mongoose.connection.readyState === 1
      ? 'connected'
      : 'disconnected'
  });
});

// MongoDB connection
const MONGO_URI = process.env.MONGODB_URI;

const CashSchema = new mongoose.Schema({
  receiptNo: String,
  subscriber: String,
  amount: Number,
  paymentMethod: String,
  date: { type: Date, default: Date.now }
});

const CashRecord = mongoose.model('CashRecord', CashSchema);

const OtpSchema = new mongoose.Schema({
  mobile: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300
  }
});

const OTPModel = mongoose.model('OTP', OtpSchema);

const UserSchema = new mongoose.Schema({
  name: { type: String, default: 'Vins Admin' },
  mobile: { type: String, unique: true },
  role: { type: String, default: 'Admin Master' }
});

const UserModel = mongoose.model('User', UserSchema);

// OTP routes
app.post('/api/auth/send-otp', async (req, res) => {
  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number required'
    });
  }

  // Demo only: integrate a real SMS provider before production.
  const otp = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  try {
    await OTPModel.deleteMany({ mobile });
    await OTPModel.create({ mobile, otp });

    // Do not return OTPs to users in production.
    console.log(`OTP generated for ${mobile}`);

    res.json({
      success: true,
      message: 'OTP generated. SMS delivery must be configured.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating OTP'
    });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { mobile, otp } = req.body;

  try {
    const validOtp = await OTPModel.findOne({ mobile, otp });

    if (!validOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    let user = await UserModel.findOne({ mobile });

    if (!user) {
      user = await UserModel.create({
        name: 'Vins Admin',
        mobile,
        role: 'Admin Master'
      });
    }

    await OTPModel.deleteOne({ _id: validOtp._id });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Verification failed'
    });
  }
});

// Cash record routes
app.get('/api/cash-records', async (req, res) => {
  try {
    const records = await CashRecord.find().sort({ date: -1 });
    res.json({ success: true, records });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/cash-records', async (req, res) => {
  try {
    const record = await CashRecord.create(req.body);
    res.json({ success: true, record });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

async function startServer() {
  const PORT = process.env.PORT || 5000;

  if (!MONGO_URI) {
    console.error('Missing MONGODB_URI environment variable');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

startServer();
```
