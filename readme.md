# 🎓 College Connect

**College Connect** is a full-stack campus networking platform built exclusively for college students.  
It provides a secure, college-verified environment for communication, collaboration, and resource sharing.

The platform integrates **forums, real-time chat, marketplace, trips/carpooling, friends system, notifications, and moderation tools** into one unified application.

> 🌐 **Live Site:** https://college-connect-o8yt.onrender.com/  
> 
---

## 📌 Overview

College Connect addresses common campus needs:
- College-only discussions and announcements
- Secure peer-to-peer messaging
- Buying and selling items within campus
- Organizing trips and carpools
- Friend-based interactions
- Strong moderation and reporting

All content and interactions are **scoped to the user’s college**, ensuring privacy and relevance.

---

## ✨ Core Features

### 🔐 Authentication & Security
- JWT-based authentication
- Email verification system
- Forgot & reset password flow
- Protected routes via middleware
- Role-based access control:
  - User
  - Moderator
  - Admin
- College-scoped data access
- Blocked users hidden globally

---

### 💬 Forum
- Create posts with title, content, and images (up to 3)
- Comment and reply system
- Edit/delete own posts and replies
- Keyword search
- Deep-link highlighting
- Content reporting
- Auto-refresh using polling

**Moderator Capabilities**
- Delete any post, comment, or reply
- View all forum content in the college

---

### 🛒 Marketplace
- List items with:
  - Title
  - Category
  - Price (validated)
  - Description
  - Images (up to 3)
- Comment and reply on listings
- Reserve / unreserve items (seller only)
- Mark items as sold
- Delete own listings
- Feed prioritizes friends’ listings
- Blocked sellers hidden

**Moderator Capabilities**
- Remove any item or comment
- View all marketplace content

---

### 🚗 Trips / Carpooling
- Create trips with:
  - Source → Destination
  - Date & time
  - Valid-till date
  - Passenger limit
- Search trips by route
- Request to join trips
- Approve/reject requests (creator only)
- Prevents overbooking and past trips
- Auto-expires invalid trips
- Trip creator always included
- Clickable creator profile

---

### 💬 Real-Time Chat
- One-to-one chat
- Socket.IO powered
- Message timestamps
- Seen/read indicators
- Image & video support
- Unread message badges
- Auto-scroll behavior
- Chat redirects from trips & notifications

---

### 👥 Friends System
- Send & accept friend requests
- Friends-first content prioritization
- View friend profiles
- Global blocking system

---

### 🔔 Notifications
- Triggered for:
  - Forum replies
  - Marketplace comments/replies
  - Trip join requests & approvals
- Clickable deep links
- Auto-clears on interaction

---

### 🛡️ Moderation & Reports
- Content reporting system
- Moderators/Admins can:
  - Remove forum posts and replies
  - Remove marketplace items and comments
  - View all reported content
- Users manage only their own content

---

## 🧰 Tech Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Fetch API
- Socket.IO Client

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- Multer (file uploads)
- Socket.IO

---

## 🏗 Architecture Overview
- RESTful API architecture
- JWT-protected routes
- Role-based permissions
- College-scoped queries
- Client polling for updates
- WebSockets for real-time messaging

---

## 📁 Project Structure

```
college-connect/
├── frontend/
│   ├── app.js
│   ├── chat.html
│   ├── chat.js
│   ├── dashboard.html
│   ├── forgot-password.html
│   ├── forum.html
│   ├── friends.html
│   ├── friends.js
│   ├── index.html
│   ├── login.html
│   ├── login.js
│   ├── marketplace.html
│   ├── moderator.html
│   ├── notifications.html
│   ├── privacy.html
│   ├── profile.html
│   ├── profile.js
│   ├── reset-password.html
│   ├── signup.html
│   ├── signup.js
│   ├── trips.html
│   ├── verify-email.html
│   └── style.css
│
├── middleware/
│   ├── auth.js
│   ├── chatUpload.js
│   ├── limit.js
│   ├── requireVerified.js
│   ├── upload.js
│   ├── validate.js
│   └── validateUpload.js
│
├── models/
│   ├── College.js
│   ├── ContactMessage.js
│   ├── Item.js
│   ├── ItemComment.js
│   ├── Message.js
│   ├── Notification.js
│   ├── Post.js
│   ├── Report.js
│   ├── Trip.js
│   └── User.js
│
├── routes/
│   ├── auth.js
│   ├── chat.js
│   ├── colleges.js
│   ├── contact.js
│   ├── forum.js
│   ├── friends.js
│   ├── marketplace.js
│   ├── moderator.js
│   ├── notifications.js
│   ├── profile.js
│   ├── reports.js
│   ├── trips.js
│   └── verification.js
│
├── scripts/
│   ├── colleges.json
│   └── seedColleges.js
│
├── uploads/
│
├── utils/
│   └── sendEmail.js
│
├── .env
├── .gitignore
├── email-test.js
├── package.json
├── server.js
└── socket.js
```

---


## ▶️ How to Run Locally

```
node server.js

```

---

## 🚀 Future Improvements
- Refresh token support
- Advanced moderation dashboard
- Push notifications
- Better rate limiting
- UI/UX polish
- Accessibility enhancements

---

## 📄 License

© 2026 College Connect.  
All rights reserved.

This source code is provided for educational reference only.
Commercial use, redistribution, or deployment without permission is prohibited.

---

**College Connect — built for students, by students.**
