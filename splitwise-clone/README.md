# Splitwise Clone - Expense Management App

A full-stack expense sharing application built with Node.js, Express, MongoDB, and vanilla JavaScript. Split bills with friends and track who owes what.

## Features

- User authentication with email verification
- Create groups and invite members
- Add and split expenses automatically
- Track balances and settlements
- View spending analytics with charts
- Profile management with image upload
- Responsive design

## Tech Stack

**Backend:**
- Node.js & Express
- MongoDB with Mongoose
- JWT authentication
- Nodemailer for emails
- Multer for file uploads

**Frontend:**
- HTML5, CSS3, JavaScript
- Chart.js for analytics
- Font Awesome icons

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   Create `.env` file in `backend/` folder:
   ```env
   DB_URI=mongodb://localhost:27017/splitwise-clone
   JWT_SECRET=your-secret-key
   MAIL_USER=your-email@gmail.com
   MAIL_PASS=your-app-password
   ```

3. **Start the application**
   ```bash
   npm start
   ```

4. **Open your browser**
   Go to `http://localhost:5000`

## Usage

1. Register an account or login
2. Create a group and add members
3. Add expenses and they'll be split automatically
4. View balances to see who owes what
5. Record settlements when payments are made
6. Check analytics for spending insights

## Project Structure

```
splitwise-clone/
├── backend/
│   ├── config/         # Database configuration
│   ├── middleware/     # Authentication middleware
│   ├── models/         # MongoDB schemas
│   ├── routes/         # API endpoints
│   └── server.js       # Main server file
├── frontend/
│   ├── css/           # Stylesheets
│   ├── js/            # JavaScript files
│   └── *.html         # HTML pages
└── README.md
```

## API Endpoints

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/groups` - Get user groups
- `POST /api/groups` - Create new group
- `POST /api/expenses` - Add expense
- `GET /api/balance/summary` - Get balance summary

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License