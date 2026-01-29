# 💰 Splitwise Clone - Expense Sharing Made Easy

A modern, full-stack expense sharing application built with Node.js, Express, MongoDB, and vanilla JavaScript. Split bills, track balances, and manage group expenses with a beautiful cyberpunk-inspired UI.

## ✨ Features

### 🔐 Authentication & User Management
- **Secure Registration & Login** - JWT-based authentication
- **Profile Management** - Update personal information and change passwords
- **Profile Photo Upload** - Drag-and-drop image upload with real-time preview
- **User Dashboard** - Personalized expense tracking and statistics

### 👥 Group Management
- **Create Groups** - Organize expenses by groups (trips, roommates, etc.)
- **Invite Members** - Add friends via email to share expenses
- **Delete Groups** - Remove groups and all associated expenses
- **Member Management** - View and manage group participants

### 💸 Expense Tracking
- **Add Expenses** - Record shared expenses with automatic splitting
- **Expense Categories** - Organize by food, transport, accommodation, etc.
- **Real-time Calculations** - Automatic balance calculations and updates
- **Expense History** - View detailed transaction history

### 📊 Balance Management
- **Smart Balance Calculation** - Track who owes what to whom
- **Detailed Breakdown** - Person-by-person balance analysis
- **Settlement Tracking** - Mark debts as settled
- **Visual Balance Cards** - Color-coded balance indicators

### 🎨 Modern UI/UX
- **Cyberpunk Theme** - Futuristic design with neon gradients
- **Responsive Design** - Works seamlessly on all devices
- **Real-time Notifications** - Instant feedback for all actions
- **Loading States** - Smooth user experience with progress indicators
- **Drag & Drop** - Intuitive file upload for profile photos

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

### Frontend
- **Vanilla JavaScript** - Pure JS for maximum performance
- **HTML5 & CSS3** - Modern web standards
- **Font Awesome** - Icon library
- **CSS Grid & Flexbox** - Responsive layouts
- **CSS Animations** - Smooth transitions and effects

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/splitwise-clone.git
   cd splitwise-clone
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/splitwise
   JWT_SECRET=your_super_secret_jwt_key_here
   PORT=5000
   ```

4. **Start the application**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:5000`

## 📁 Project Structure

```
splitwise-clone/
├── backend/
│   ├── config/
│   │   └── db.js              # Database connection
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── models/
│   │   ├── User.js            # User schema
│   │   ├── Group.js           # Group schema
│   │   └── Expense.js         # Expense schema
│   ├── routes/
│   │   ├── authRoutes.js      # Authentication endpoints
│   │   ├── userRoutes.js      # User management endpoints
│   │   ├── groupRoutes.js     # Group management endpoints
│   │   ├── expenseRoutes.js   # Expense management endpoints
│   │   └── balanceRoutes.js   # Balance calculation endpoints
│   ├── uploads/               # File upload directory
│   └── server.js              # Main server file
├── frontend/
│   ├── css/
│   │   └── style.css          # Main stylesheet
│   ├── js/
│   │   ├── config.js          # API configuration
│   │   ├── login.js           # Login functionality
│   │   ├── signup.js          # Registration functionality
│   │   ├── dashboard.js       # Main dashboard logic
│   │   └── passport.js        # Profile page logic
│   ├── index.html             # Login page
│   ├── signup.html            # Registration page
│   ├── dashboard.html         # Main dashboard
│   ├── profile.html           # User profile page
│   ├── balances.html          # Balance details page
│   └── groups.html            # Group management page
├── package.json
├── .env.example
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### User Management
- `GET /api/profile/passport` - Get user profile data
- `PUT /api/profile/update` - Update user profile
- `POST /api/profile/upload-image` - Upload profile image
- `GET /api/profile/activity` - Get user activity history

### Group Management
- `GET /api/groups` - Get user's groups
- `POST /api/groups` - Create new group
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/add-member` - Add member to group

### Expense Management
- `GET /api/expenses/:groupId` - Get group expenses
- `POST /api/expenses` - Create new expense
- `DELETE /api/expenses/:id` - Delete/settle expense

### Balance Tracking
- `GET /api/balance/summary` - Get balance summary
- `GET /api/balance/details` - Get detailed balance breakdown

## 🎯 Key Features Explained

### Smart Balance Calculation
The application automatically calculates who owes what based on:
- Who paid for each expense
- How expenses are split among group members
- Real-time updates when expenses are added or settled

### Group-based Expense Management
- Expenses are organized by groups (e.g., "Weekend Trip", "Apartment Rent")
- Each group can have multiple members
- Expenses are automatically split equally among all group members

### Secure File Upload
- Profile photos are validated for type and size
- Files are stored securely on the server
- Drag-and-drop interface for easy uploading

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt for secure password storage
- **Input Validation** - Server-side validation for all inputs
- **File Upload Security** - Type and size validation for uploads
- **CORS Protection** - Configured for secure cross-origin requests

## 🎨 UI/UX Highlights

- **Cyberpunk Theme** - Modern neon gradients and futuristic design
- **Responsive Design** - Mobile-first approach with CSS Grid/Flexbox
- **Real-time Feedback** - Instant notifications for all user actions
- **Loading States** - Smooth loading indicators and progress bars
- **Error Handling** - User-friendly error messages and recovery options

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment
1. Set environment variables
2. Build and start the application:
   ```bash
   npm start
   ```

### Docker Deployment (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Splitwise for the core functionality
- Font Awesome for the beautiful icons
- MongoDB for the flexible database solution
- Express.js community for the robust framework

## 📞 Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/yourusername/splitwise-clone/issues) page
2. Create a new issue with detailed information
3. Contact the maintainers

---

**Made with ❤️ and lots of ☕**

*Happy expense splitting! 💰*