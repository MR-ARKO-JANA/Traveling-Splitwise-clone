// Email configuration
module.exports = {
    // Gmail configuration
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com', // Replace with your Gmail
        pass: process.env.EMAIL_PASS || 'your-app-password'     // Replace with your Gmail App Password
    },
    
    // Email templates
    from: process.env.EMAIL_FROM || 'Splitwise Clone <your-email@gmail.com>',
    
    // Instructions for setup:
    // 1. Go to your Google Account settings
    // 2. Enable 2-Factor Authentication
    // 3. Generate an App Password for this application
    // 4. Replace 'your-email@gmail.com' with your actual Gmail
    // 5. Replace 'your-app-password' with the generated App Password
    // 6. Or set EMAIL_USER and EMAIL_PASS environment variables
};