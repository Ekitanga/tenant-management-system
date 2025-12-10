# ⚡ SPIRALDART TMS - QUICK START (CORRECTED)

## 🎯 THE SIMPLEST WAY TO START

---

## 📦 WHAT YOU NEED

1. **spiraldart-tms-WORKING.tar.gz** (18KB) - The complete app
2. **Node.js** installed (from https://nodejs.org/)

---

## 🚀 3-STEP SETUP

### Step 1: Extract
```cmd
cd C:\Projects
tar -xzf spiraldart-tms-WORKING.tar.gz
move spiraldart-tms-final spiraldart-tms
cd spiraldart-tms
```

### Step 2: Start Backend
```cmd
Double-click: 2-START-BACKEND.bat
```
**Wait for**: "Server running on port 5000"  
**⚠️ KEEP WINDOW OPEN!**

> **Note**: This automatically creates the database with sample data if it doesn't exist!

### Step 3: Start Frontend
```cmd
Double-click: 3-START-FRONTEND.bat
```
**Browser opens** automatically to http://localhost:3000  
**⚠️ KEEP WINDOW OPEN!**

### Step 4: Login
```
Username: admin
Password: admin123
```

**Done!** 🎉

---

## 📁 BATCH FILES EXPLAINED

### **2-START-BACKEND.bat**
- ✅ Run this FIRST every time
- Creates database automatically (first time)
- Starts server on port 5000
- Keep window open!

### **3-START-FRONTEND.bat**
- ✅ Run this SECOND every time
- Opens browser automatically
- Connects to backend
- Keep window open!

### **4-RESET-DATABASE.bat**
- ⚠️ Only use if you want to DELETE all data
- Starts fresh with sample data
- Run rarely, only when needed

### **1-SETUP-DATABASE.bat** (OPTIONAL)
- Not needed! Backend creates database automatically
- Only use if you want to setup database separately
- Skip this file entirely (it's optional)

---

## 💡 RECOMMENDED WORKFLOW

### First Time:
1. Extract archive ✓
2. Run `2-START-BACKEND.bat` ✓
3. Run `3-START-FRONTEND.bat` ✓
4. Login ✓

### Every Day After:
1. Run `2-START-BACKEND.bat` ✓
2. Run `3-START-FRONTEND.bat` ✓
3. Use the system ✓

**That's it!** No database setup needed - it's automatic! 🚀

---

## ✅ VERIFICATION

After starting both servers:

1. **Backend Health**: http://localhost:5000/health
   ```json
   {"status":"ok","message":"Spiraldart TMS API is running"}
   ```

2. **Frontend**: http://localhost:3000
   - Should show maroon login page

3. **Login**: admin / admin123
   - Should go to dashboard

4. **Test**: Click "Add Property"
   - Button should open a modal form

If all work ✅ **System is fully operational!**

---

## 🔐 DEFAULT CREDENTIALS

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin (full access) |
| landlord | landlord123 | Landlord (property management) |
| john.mwangi | tenant123 | Tenant (limited access) |
| mary.akinyi | tenant123 | Tenant (limited access) |

---

## 📊 WHAT'S INCLUDED

After first startup, you'll have:

- ✅ 4 user accounts (see table above)
- ✅ 1 property: "Velvet Haven"
- ✅ 6 units: 1A, 1B, 2A, 2B, 3A, 3B
- ✅ All units vacant (ready to assign)
- ✅ Database file: `backend/spiraldart.db`

---

## 🆘 TROUBLESHOOTING

### "Port 5000 already in use"
```cmd
netstat -ano | findstr :5000
taskkill /PID [number] /F
```

### "Module not found"
```cmd
cd backend
npm install
```

### Want to start fresh?
```cmd
Close both servers (Ctrl+C)
Double-click: 4-RESET-DATABASE.bat
Double-click: 2-START-BACKEND.bat
Double-click: 3-START-FRONTEND.bat
```

### Database errors?
```cmd
Double-click: 4-RESET-DATABASE.bat
```

---

## 🎯 REMEMBER

**Daily Use:**
1. `2-START-BACKEND.bat` ← Run FIRST
2. `3-START-FRONTEND.bat` ← Run SECOND
3. Login and use!

**Don't Need:**
- ❌ Database setup (automatic!)
- ❌ Manual npm install (automatic!)
- ❌ Database reset (only if needed)

**Keep Open:**
- ✅ Both CMD windows while using system
- ✅ Browser tab with the app

**Close When Done:**
- Press Ctrl+C in both CMD windows
- Close browser tab

---

## 📚 MORE HELP

- **📖_BATCH_FILES_GUIDE.md** - Detailed batch file guide
- **TROUBLESHOOTING.txt** - 18+ solutions
- **✅_SETUP_INSTRUCTIONS_FIXED.md** - Complete guide

---

## ✨ FEATURES

Once logged in, you can:

✅ Manage properties and units  
✅ Register tenants  
✅ Create leases  
✅ Record payments (M-PESA, Cash, Bank, Cheque)  
✅ Track expenses  
✅ Handle maintenance requests  
✅ View dashboard statistics  
✅ All buttons functional!  
✅ Maroon theme throughout  

---

**Everything works!** Just run the 2 batch files and login. Simple! 🎉

---

**Version**: 1.0.1 (Corrected)  
**Date**: November 2024  
**Status**: Production Ready ✅
