'use strict';

const nodemailer = require('nodemailer');

// Gmail SMTP transporter — works for any recipient, no domain needed
// Requires Gmail App Password (not your regular Gmail password)
// Setup: myaccount.google.com/apppasswords
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // 16-char App Password
  },
});

/**
 * Send a password reset email.
 * @param {string} to       - Recipient email (any email address)
 * @param {string} resetUrl - Full reset link
 */
const sendPasswordResetEmail = async (to, resetUrl) => {
  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Reset your Streamora password</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:48px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:500px;background:#111111;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">

        <tr>
          <td style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="color:#e50914;font-size:22px;font-weight:900;letter-spacing:-0.5px;">Stream</span><span style="color:#e8e8e8;font-size:22px;font-weight:900;letter-spacing:-0.5px;">ora</span>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 32px;">
            <h1 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#f0f0f0;line-height:1.3;">Reset your password</h1>
            <p style="margin:0 0 28px;font-size:14px;color:#777;line-height:1.7;">
              We received a request to reset the password for your Streamora account.
              Click the button below to set a new password.
              This link is valid for <strong style="color:#ccc;">1 hour</strong>.
            </p>

            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#e50914;border-radius:50px;">
                  <a href="${resetUrl}"
                    style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                    Reset password →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-size:12px;color:#555;line-height:1.6;">
              If the button doesn't work, copy and paste this link:
            </p>
            <p style="margin:0;font-size:11px;color:#3ea6ff;word-break:break-all;line-height:1.6;">${resetUrl}</p>

            <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:12px;color:#444;line-height:1.6;">
                If you didn't request this, you can safely ignore this email. Your password won't change.
              </p>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:18px 32px;border-top:1px solid rgba(255,255,255,0.05);">
            <p style="margin:0;font-size:11px;color:#333;">© ${year} Streamora. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Reset your Streamora password',
    html,
  });
};

module.exports = { sendPasswordResetEmail };
