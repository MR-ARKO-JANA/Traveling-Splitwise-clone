# 📧 Email Setup Guide for OTP System

## Steps to Enable Real Email Sending:

### 1. Enable 2-Factor Authentication on Gmail
1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click on "Security" in the left sidebar
3. Under "Signing in to Google", click "2-Step Verification"
4. Follow the steps to enable 2FA

### 2. Generate App Password
1. After enabling 2FA, go back to Security settings
2. Under "Signing in to Google", click "App passwords"
3. Select "Mail" as the app
4. Select "Other (Custom name)" as the device
5. Enter "Splitwise Clone" as the name
6. Click "Generate"
7. **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)

### 3. Update .env File
Open `splitwise-clone/backend/.env` and update:

```env
MAIL_USER=arkojana45@gmail.com
MAIL_PASS=abcd efgh ijkl mnop
```

Replace:
- `arkojana45@gmail.com` with your actual Gmail address
- `abcd efgh ijkl mnop` with your generated App Password

### 4. Restart Server
After updating .env, restart the server:
```bash
# Stop current server (Ctrl+C)
# Then restart:
cd splitwise-clone/backend
node server.js
```

### 5. Test OTP System
1. Go to login page
2. Click "Forgot Password?"
3. Enter your email address
4. Check your Gmail inbox for the OTP email
5. Use the OTP to reset your password

## Troubleshooting:

### If emails are not sending:
1. **Check Gmail settings**: Make sure 2FA is enabled
2. **Verify App Password**: Make sure you copied it correctly (no spaces)
3. **Check server logs**: Look for error messages in the console
4. **Gmail security**: Sometimes Gmail blocks new apps, check your security notifications

### If you see "Less secure app access":
- This is outdated. Use App Passwords instead (steps above)

### If emails go to Spam:
- Check your Spam/Junk folder
- Mark the email as "Not Spam"

## Current Status:
- ✅ Server is running
- ✅ OTP system is working (console mode)
- ⏳ Email sending needs configuration (follow steps above)

Once configured, you'll receive beautiful HTML emails with your OTP codes! 🎉