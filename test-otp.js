// Test script for OTP functionality
const https = require('https');
const http = require('http');

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        const req = client.request(url, {
            method: options.method || 'GET',
            headers: options.headers || {}
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        json: () => Promise.resolve(JSON.parse(data))
                    });
                } catch (e) {
                    resolve({
                        ok: res.statusCode >= 200 && res.statusCode < 300,
                        status: res.statusCode,
                        text: () => Promise.resolve(data)
                    });
                }
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

async function testOTPSystem() {
    const baseURL = 'http://localhost:5000/api/auth';
    
    console.log('🧪 Testing OTP System...\n');
    
    try {
        // Test 1: Test route
        console.log('1️⃣ Testing server connection...');
        const testRes = await makeRequest(`${baseURL}/test`);
        const testData = await testRes.json();
        console.log('✅ Server connection:', testData.message);
        
        // Test 2: Send OTP to a test email
        console.log('\n2️⃣ Testing OTP sending...');
        const otpRes = await makeRequest(`${baseURL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'arkojana45@gmail.com' })
        });
        
        const otpData = await otpRes.json();
        console.log('📧 OTP Response:', otpData);
        
        if (otpData.emailSent) {
            console.log('✅ Email sent successfully!');
        } else {
            console.log('⚠️ Email sending failed, but OTP generated');
        }
        
        console.log('\n🎉 OTP System Test Complete!');
        console.log('📧 Check your email: arkojana45@gmail.com');
        console.log('🔍 Check server console for OTP backup');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testOTPSystem();