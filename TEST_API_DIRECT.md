# Test API Directly

## Step 1: Get login token
Open browser console and run:
```javascript
// First, get user data
const email = prompt("Enter admin_zona user email (or click Cancel for test)");
const password = prompt("Enter password");

fetch('/api/auth/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password})
})
.then(r => r.json())
.then(data => {
    console.log('Login response:', data);
    if (data.token) {
        localStorage.setItem('jwt_token', data.token);
        console.log('Token saved. User:', data.user);
        console.log('zona_id:', data.user.zona_id);
    }
});
```

## Step 2: Test invoice list API
```javascript
const token = localStorage.getItem('jwt_token');

fetch('/api/invoice/list?limit=20&offset=0', {
    headers: {'Authorization': `Bearer ${token}`}
})
.then(r => r.json())
.then(data => {
    console.log('Invoice API response:');
    console.log('  success:', data.success);
    console.log('  count:', data.count);
    console.log('  data length:', data.data.length);
    console.log('  first invoice:', data.data[0]);
});
```

## Step 3: Check backend logs
Look for these lines in terminal:
- `[Invoice List] Filtering for admin_zona with zona_id: XX`
- `[Invoice List] Returned N invoices`

If returning 0, look for:
- `⚠️ Admin_zona XX returned 0 invoices!`
- Check what the diagnostic query shows
