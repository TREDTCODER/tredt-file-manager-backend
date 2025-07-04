# 📁 TREDT Union Online File Management System

A secure, self-hostable file management web application for the TREDT Union. Supports public downloads, private access requests with email alerts, and admin-only uploads.

---

## 🔧 Features

| Type       | Feature Description                                          |
|------------|--------------------------------------------------------------|
| Public     | View/download files without login                           |
| Private    | Request access (email alert sent to admin)                 |
| Upload     | Admin-only uploads with title, description, tags            |
| Metadata   | Title, description, tags, uploaded_by, date                 |
| Email      | Sends alerts to admin via Gmail                             |
| Search     | Search files by title or tags                               |

---

## 🏗️ Project Structure

```
backend/
├── server.js         # Main Node.js Express server
├── uploads/          # Public and private file storage
│   ├── public/
│   └── private/
├── db.sqlite3        # SQLite database (auto-created)
├── .env.example      # Environment config example
├── package.json      # Node.js dependencies and scripts
└── README.md         # This file
```

---

## 🚀 Getting Started

### 1. Clone the Repo
```bash
git clone https://github.com/your-username/tredt-file-manager-backend.git
cd tredt-file-manager-backend/backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Copy the `.env.example` and rename it:
```bash
cp .env.example .env
```
Edit `.env` and add your Gmail App Password:
```env
PORT=10000
ADMIN_EMAIL=soumya.deep.das.tredt@gmail.com
ADMIN_PASS=your-gmail-app-password
```

> ⚠️ Use Gmail App Password, not your main Gmail password!

### 4. Run the Server
```bash
node server.js
```
Visit: [http://localhost:10000](http://localhost:10000)

---

## 🌍 Deploy to Render

1. Push this project to GitHub
2. Go to [https://render.com](https://render.com)
3. Create a **new Web Service**
4. Connect your repo, set build/start commands:
   - Build: `npm install`
   - Start: `npm start`
   - Environment: `Node`
5. Add your `.env` variables in Render dashboard

---

## 📬 API Endpoints

### POST `/api/upload`
Upload a new file (admin only)
- Body: `form-data` → title, description, tags, type, file

### GET `/api/files/public`
Returns all public files

### GET `/api/files/search?q=keyword`
Returns files matching the keyword

### POST `/api/files/request`
Sends an email to admin requesting a private file
- Body: `{ filename, requester, reason }`

### GET `/api/files/download/:id`
Downloads a file by its ID

---

## 📬 Contact
**Admin**: Soumya D. Das  
**Email**: soumya.deep.das.tredt@gmail.com

---

## 📜 License
MIT License (or your custom TREDT License)
