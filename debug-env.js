require('dotenv').config();

console.log('Environment Debug:');
console.log('MAIL_USER:', JSON.stringify(process.env.MAIL_USER));
console.log('MAIL_PASS:', JSON.stringify(process.env.MAIL_PASS));
console.log('MAIL_PASS length:', process.env.MAIL_PASS ? process.env.MAIL_PASS.length : 'undefined');
console.log('MAIL_PASS chars:', process.env.MAIL_PASS ? process.env.MAIL_PASS.split('').map(c => c.charCodeAt(0)) : 'undefined');