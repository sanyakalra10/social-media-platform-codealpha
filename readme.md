# 🌐 Social Connect - Mini Social Media Platform

**CodeAlpha Internship - Task 2**  
Built by: **Sanya Kalra**

## ✅ Features Implemented

### User Features
- ✅ **User Registration/Login** with password encryption (bcrypt)
- ✅ **User Profiles** with bio and profile picture
- ✅ **Create Posts** with text and images
- ✅ **Like/Unlike Posts** with real-time count
- ✅ **Comment System** with add/delete functionality
- ✅ **Follow/Unfollow Users** (implemented in backend)
- ✅ **View Followers & Following** lists
- ✅ **Edit Profile** (bio, profile picture)
- ✅ **Delete Posts** (own posts only)
- ✅ **Delete Comments** (own comments only)

### Technical Stack

**Frontend:**
- HTML5
- CSS3 (Responsive Design)
- Vanilla JavaScript (ES6+)

**Backend:**
- Node.js
- Express.js
- SQLite3 (better-sqlite3)
- bcrypt (password hashing)
- CORS

**Database Schema:**
- `users` - User profiles
- `posts` - User posts
- `comments` - Post comments
- `followers` - Follow relationships
- `likes` - Post likes

---

## 🚀 How to Run

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Start Backend Server
```bash
npm start
```
Server runs on: `http://localhost:5000`

### Step 3: Open Frontend
Open `frontend/login.html` in your browser or use Live Server in VS Code.

---

## 📁 Project Structure
