# 🔧 Server Connection Error - Troubleshooting Guide

## Common Issues & Solutions

### ⚠️ Error: "Lỗi kết nối server" (Server Connection Error)

This error occurs when the frontend cannot connect to the backend or make API requests.

---

## 🔍 Quick Diagnostics

### 1. **Check if Server is Running**

```bash
# Terminal 1: Start backend server
npm start

# Should see: "Server is running on port 5000"
```

### 2. **Check API Endpoint Health**

```bash
# In browser console or use curl
curl http://localhost:5000/api/health

# Should return: { "status": "OK", "message": "Server is running" }
```

### 3. **Verify Frontend-Backend Connection**

Open DevTools Console (F12) and check for:
- ✅ Socket connected messages
- ❌ Connection errors
- ✅ API response status

---

## 🛠️ Common Problems & Fixes

### Problem 1: **Backend Server Not Running**

**Symptoms:**
- Console shows connection refused
- Red warning: "Lỗi kết nối server"
- No successful API response

**Solution:**
```bash
# 1. Navigate to project root
cd d:\LLMessage

# 2. Ensure dependencies installed
npm install

# 3. Start backend server
npm start

# 4. Verify server started
# Output should show: "Server is running on port 5000"
#                   "MongoDB connected successfully"
```

---

### Problem 2: **MongoDB Connection Failed**

**Symptoms:**
- Server starts but shows "MongoDB connection failed"
- API requests fail with database errors

**Solution:**
```bash
# 1. Check MongoDB is running
# Windows: Start MongoDB service
net start MongoDB

# Linux/Mac: 
brew services start mongodb-community

# 2. Verify connection string in Config/Setting.json
# Should be: "mongodb://localhost:27017/LLMessage"

# 3. If using remote database, verify connection string
# Format: mongodb+srv://username:password@cluster.mongodb.net/LLMessage

# 4. If using Docker MongoDB:
docker run -d -p 27017:27017 --name mongodb mongo

# 5. Test connection
mongo mongodb://localhost:27017/LLMessage
```

---

### Problem 3: **Frontend-Backend Port Mismatch**

**Symptoms:**
- Socket shows "connecting" but never connects
- API requests fail with CORS or connection errors

**Solution:**
```bash
# Check that both are using correct ports:
# Backend: http://localhost:5000  (default in Config/Setting.json)
# Frontend: http://localhost:3000 (default for React)

# 1. Verify backend port in Config/Setting.json:
{
  "server": {
    "port": 5000,
    "clientUrl": "http://localhost:3000"
  }
}

# 2. Verify frontend proxy in apps/views/package.json:
{
  "proxy": "http://localhost:5000"
}

# 3. Verify Socket URL in frontend (.env or hardcoded):
REACT_APP_SOCKET_URL=http://localhost:5000
# or in apps/views/src/services/socket.js:
const socketURL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
```

---

### Problem 4: **CORS Error**

**Symptoms:**
- Console shows CORS errors
- API requests blocked by browser
- "No 'Access-Control-Allow-Origin' header"

**Solution:**
```bash
# Verify CORS config in app.js:
app.use(cors({
    origin: config.server.clientUrl,  // Should be http://localhost:3000
    credentials: true
}));

# Ensure Config/Setting.json has correct clientUrl:
{
  "server": {
    "clientUrl": "http://localhost:3000"
  }
}

# Restart server after changes
npm start
```

---

### Problem 5: **JWT/Authentication Error**

**Symptoms:**
- Socket connection fails with "Authentication error"
- Console shows "Invalid or expired token"
- Admin dashboard stats load but with auth errors

**Solution:**
```bash
# 1. Verify JWT_SECRET is set (check app.js loads config correctly)
# The secret should match on backend and should not be default in production

# 2. Check token format in localStorage
# Open DevTools → Application → Local Storage
# Should see token like: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 3. If token is missing:
#   - Login again
#   - Check login endpoint returns token

# 4. If token is invalid:
#   - Clear localStorage: localStorage.clear()
#   - Log out and log back in
```

---

### Problem 6: **Missing Admin Stats Endpoint**

**Symptoms:**
- Admin Dashboard shows: "Lỗi kết nối server"
- Console shows 404 on `/users/admin/stats`
- Stats never load

**Solution:**
```bash
# This has been FIXED in the latest update.
# The endpoint now exists at: GET /api/users/admin/stats

# Verify in usercontroller.js:
router.get("/admin/stats", isAdmin, async function(req, res) {
    // Returns: { totalUsers, totalMessages, onlineUsers, totalConversations }
});

# If still failing:
# 1. Restart server after code updates
# 2. Check user is actually admin role in database
# 3. Verify token includes proper user ID
```

---

### Problem 7: **Socket Listener Duplicate Warnings**

**Symptoms:**
- Console shows: "⚠️ Listener already registered for 'event-name'"
- Console shows: "⚠️ Listeners already setup - skipping to prevent duplicates"

**Solution:**
```bash
# This warning occurs when re-registering listeners.
# It's benign but can be reduced by:

# 1. Avoid calling setupSocketListeners multiple times
# 2. Check SocketContext isn't re-rendering unnecessarily
# 3. Ensure socket connection flag prevents duplicate setup

# The codebase already has protections:
# - socketConnected flag in SocketContext
# - listeners Map in SocketService to track active listeners
```

---

## 🚀 Complete Restart Procedure

If nothing works, do a complete restart:

```bash
# 1. Kill all Node processes
taskkill /F /IM node.exe    # Windows
# or
pkill -9 node               # Linux/Mac

# 2. Clear caches
cd d:\LLMessage
rmdir node_modules /s /q    # Windows
# or
rm -rf node_modules         # Linux/Mac

# 3. Clear React cache (if needed)
cd apps/views
rmdir node_modules /s /q    # or rm -rf node_modules
cd ../..

# 4. Clean npm cache
npm cache clean --force

# 5. Reinstall everything
npm install

# 6. Install frontend dependencies
cd apps/views && npm install && cd ../..

# 7. Start fresh
npm run dev
```

---

## 📊 Checklist for Debugging

Use this checklist when connecting fails:

- [ ] Backend server running on port 5000
- [ ] MongoDB running and accessible
- [ ] Frontend running on port 3000
- [ ] CORS configuration correct (clientUrl = http://localhost:3000)
- [ ] JWT_SECRET consistent between sessions
- [ ] User token valid (check localStorage)
- [ ] User has admin role (if accessing admin endpoints)
- [ ] No firewall blocking localhost:5000 or localhost:3000
- [ ] Socket transport includes 'websocket' and 'polling'
- [ ] No duplicate socket listeners registered

---

## 🔗 API Endpoints Quick Reference

| Endpoint | Method | Auth Required | Purpose |
|----------|--------|---------------|---------|
| `/api/health` | GET | ❌ | Check server health |
| `/api/auth/login` | POST | ❌ | User login |
| `/api/auth/me` | GET | ✅ | Get current user |
| `/api/users` | GET | ✅ | List users |
| `/api/users/admin/stats` | GET | ✅ Admin | Dashboard statistics |
| `/api/messages` | POST | ✅ | Send message |
| `/api/friends/request` | POST | ✅ | Send friend request |

---

## 📝 Logs to Check

### Backend Logs (Server console)
```
✅ "Server is running on port 5000"
✅ "MongoDB connected successfully"
✅ "User connected: [userId]"
❌ "MongoDB connection failed"
❌ "Server startup error"
```

### Frontend Logs (Browser DevTools Console)
```
✅ "✅ Socket connected"
✅ "SocketContext: Socket connected/reconnected"
❌ "❌ Socket connection error"
❌ "❌ SocketService on socket not available"
❌ "Load stats error!"
```

---

## 🎯 When to Check What

**If I see: "Lỗi kết nối server"**
1. First: Check if backend is running (`npm start`)
2. Then: Check MongoDB is running
3. Then: Look at browser console for specific error
4. Then: Check Config/Setting.json values

**If I see: "Socket connection error"**
1. First: Verify backend is running
2. Then: Check config ports match
3. Then: Verify JWT secret (or use default in dev)
4. Then: Check CORS configuration

**If I see: "404 on /api/users/admin/stats"**
1. Endpoint is now implemented ✓
2. Make sure you're logged in as admin
3. Restart backend server
4. Hard refresh frontend (Ctrl+Shift+R)

---

## 💡 Pro Tips

1. **Always restart both frontend and backend after code changes**
   ```bash
   npm run dev:all  # Runs both concurrently
   ```

2. **Use network tab to see API calls**
   - DevTools → Network tab
   - Look for status codes: 200=OK, 401=Unauthorized, 404=Not Found, 500=Server Error

3. **Check Socket status in DevTools**
   - Console → Type: `window.localStorage.getItem('token')`
   - Should return token string

4. **Test backend directly**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/users/admin/stats
   ```

---

## 📞 Still Having Issues?

1. Check all files were updated: `ERROR_ANALYSIS.md`, `SETUP_GUIDE.md`, `CLEANUP_GUIDE.md`
2. Verify new admin stats endpoint was added to `usercontroller.js`
3. Verify socket.js was updated with better error handling
4. Run complete restart procedure above
5. Clear browser cache (Ctrl+Shift+Delete)

