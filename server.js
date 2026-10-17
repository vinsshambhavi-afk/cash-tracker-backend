const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin (Optional verification or basic setup)
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB Atlas (Replace with your actual MongoDB URI if needed)
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://vinsshambhavi_db_user:<password>@cluster.mongodb.net/cashdb?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// Cash Schema & Model
const cashSchema = new mongoose.Schema({
  receiptNo: String,
  payerName: String,
  amount: Number,
  category: String,
  date: { type: Date, default: Date.now }
});
const CashRecord = mongoose.model('CashRecord', cashSchema);

// API Routes
app.get('/api/cash-records', async (req, res) => {
  try {
    const records = await CashRecord.find().sort({ date: -1 });
    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/cash-records', async (req, res) => {
  try {
    const newRecord = new CashRecord(req.body);
    await newRecord.save();
    res.json({ success: true, data: newRecord });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
