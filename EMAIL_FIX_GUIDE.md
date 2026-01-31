# 📧 Email Setup Guide - Fix OTP Email Sending

## 🚨 Current Issue
The OTP system is working perfectly, but emails are not being sent due to Gmail authentication error:
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

## 🔧 Solution Options

### Option 1: Fix Gmail App Password (Recommended)

#### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click "Security" in the left sidebar
3. Under "Signing in to Google", click "2-Step Verification"
4. Follow the setup process to enable 2FA

#### Step 2: Generate New App Password
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click "Security" → "2-Step Verification"
3. Scroll down to "App passwords"
4. Click "App passwords"
5. Select "Mail" and "Other (Custom name)"
6. Enter "Splitwise Clone" as the name
7. Click "Generate"
8. Copy the 16-character password (format: xxxx xxxx xxxx xxxx)

#### Step 3: Update .env File
Replace the MAIL_PASS in `.env` with the new App Password:
```
MAIL_PASS=your new 16 character app password
```

### Option 2: Use Alternative Email Service

#### A) Using Outlook/Hotmail
```env
MAIL_USER=your-email@outlook.com
MAIL_PASS=your-password
```

#### B) Using Yahoo Mail
```env
MAIL_USER=your-email@yahoo.com
MAIL_PASS=your-app-password
```

### Option 3: Use SMTP2GO (Free Email Service)

1. Sign up at [SMTP2GO](https://www.smtp2go.com/)
2. Get your SMTP credentials
3. Update the email configuration

## 🧪 Testing Steps

1. Update your email credentials
2. Restart the server
3. Test with: `http://localhost:5000/otp-test.html`
4. Check your email inbox for the OTP

## 📞 Need Help?

If you're still having issues, please provide:
1. Your Gmail account settings screenshot
2. Whether 2FA is enabled
3. Any error messages you see

The OTP system is 100% ready - we just need to fix the email authentication!