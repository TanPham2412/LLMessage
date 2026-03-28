# 🔍 DEBUG: User Status Issue

## Vấn đề
Tất cả users trong Admin Dashboard đang hiển thị status "✅ Hoạt động" dù có một số users đã bị khóa.

## Nguyên Nhân
1. **Database**: Tất cả users có `accountStatus = 'active'` (mặc định)
2. **UI**: Nhưng filter status hoạt động đúng
3. **Frontend**: Hiển thị logic correct

## Cách Debug & Test

### Step 1: Check Database User Data
```
GET http://localhost:5000/users/debug/users-roles
```
Xem tất cả users với field: `username, email, role, accountStatus, warnings`

**Expected Output:**
```json
{
  "success": true,
  "data": [
    { 
      "username": "user1", 
      "email": "user1@test.com", 
      "role": "user",
      "accountStatus": "active",  // ← Nên là 'active', 'locked', or 'suspended'
      "warnings": 0
    }
  ]
}
```

### Step 2: Test Setting User Status to LOCKED
```
POST http://localhost:5000/users/debug/test-locked-status/[USER_ID]
```

Replace `[USER_ID]` với user ID từ Step 1.

**Expected Result:**
```json
{
  "success": true,
  "message": "User testuser status set to locked for testing",
  "data": {
    "username": "testuser",
    "email": "test@test.com",
    "accountStatus": "locked"  // ← Thay đổi từ 'active' thành 'locked'
  }
}
```

### Step 3: Check in Admin Dashboard
1. Quay lại **Quản Lý Người Dùng**
2. Check xem user vừa set status = "locked" có hiển thị **"🔒 Bị khóa"** không?
3. Kiểm tra xem ngoài có status "✅ Hoạt động" không?

**Expected Result:**
- User "testuser" sẽ hiển thị: **"🔒 Bị khóa"**
- Status tidak còn là "✅ Hoạt động"

### Step 4: Test Status Filter
1. Chọn dropdown "Tất cả trạng thái" → Chọn "🔒 Bị khóa"
2. Grid chỉ show users với status = "locked"
3. Chọn "✅ Hoạt động"
4. Grid chỉ show users với status = "active"

## Kết Luận

- **Nếu Step 2-3-4 OK** → System hoạt động đúng ✅
  - Vấn đề là database tất cả users đều "active" mặc định
  - Cần admin có cách để khóa users (nhưng nút khóa đã bị xóa)

- **Nếu Step 2-3-4 FAIL** → Có bug cần fix

## Supress Debug Endpoints (Sau khi test)
Xóa 2 debug endpoints này trong production:
- `GET /users/debug/users-roles`
- `POST /users/debug/test-locked-status/:userId`

## Frontend Console Logs
Inspect browser console để xem API response:
- AdminUsers: `console.log('API Response:', response)`
- AdminMessages: `console.log('Messages data:', response.data)`
