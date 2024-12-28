const express = require("express");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const cors = require("cors");

dotenv.config();
const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory store for OTPs
const otpStore = new Map();

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// Endpoint to send OTP
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);

  try {
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
    });

    otpStore.set(email, { otp: otp.toString(), expiresAt: Date.now() + 5 * 60 * 1000 });

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP", error });
  }
});

// Endpoint to verify OTP
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const otpData = otpStore.get(email);

  if (otpData) {
    const { otp: storedOtp, expiresAt } = otpData;

    if (Date.now() > expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (storedOtp === otp.toString()) {
      otpStore.delete(email);
      return res.status(200).json({ message: "OTP verified successfully" });
    }
  }

  return res.status(400).json({ message: "Invalid OTP" });
});

// Endpoint to handle form submission
app.post("/submit-form", async (req, res) => {
  const { user_name, user_email, user_number, message } = req.body;

  if (!user_name || !user_email || !user_number || !message) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Email content
  const mailOptions = {
    from: process.env.EMAIL,
    to: process.env.EMAIL, // Your email to receive form submissions
    subject: "New Form Submission",
    text: `
      You have received a new form submission:
      
      Name: ${user_name}
      Email: ${user_email}
      Contact Number: ${user_number}
      Message: ${message}
    `,
  };

  try {
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Form submitted and email sent successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send email", error });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
