const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Initialize SQLite database
const db = new sqlite3.Database('./aisense.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Create tables if not exist
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS users (' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
    'name TEXT,' +
    'email TEXT UNIQUE,' +
    'password TEXT,' +
    'mobile TEXT UNIQUE,' +
    'created_at DATETIME DEFAULT CURRENT_TIMESTAMP' +
  ')');

  db.run('CREATE TABLE IF NOT EXISTS bookings (' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
    'full_name TEXT NOT NULL,' +
    'child_age INTEGER NOT NULL,' +
    'city TEXT NOT NULL,' +
    'phone TEXT NOT NULL,' +
    'message TEXT,' +
    'created_at DATETIME DEFAULT CURRENT_TIMESTAMP' +
  ')');
});

// API endpoints

// User registration
app.post('/api/register', (req, res) => {
  const { name, email, password, mobile } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const stmt = db.prepare('INSERT INTO users (name, email, password, mobile) VALUES (?, ?, ?, ?)');
  stmt.run(name || null, email, password, mobile || null, function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Email or mobile already registered.' });
      }
      return res.status(500).json({ error: 'Database error.' });
    }
    res.status(201).json({ message: 'User registered successfully.', userId: this.lastID });
  });
  stmt.finalize();
});

// User login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error.' });
    }
    if (!row) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    res.json({ message: 'Login successful.', user: { id: row.id, name: row.name, email: row.email } });
  });
});

app.post('/api/bookings', (req, res) => {
  console.log('Received booking data:', req.body);
  let { full_name, child_age_years, child_age_months, city, phone, message } = req.body;
  console.log('Raw values:', { full_name, child_age_years, child_age_months, city, phone, message });
  full_name = full_name ? full_name.toString().trim() : '';
  city = city ? city.toString().trim() : '';
  phone = phone ? phone.toString().trim() : '';
  const ageYears = Number(child_age_years);
  const ageMonths = Number(child_age_months);

  console.log('Trimmed values:', { full_name, city, phone, ageYears, ageMonths });
  console.log('Validation:', {
    full_name_valid: full_name.length > 0,
    city_valid: city.length > 0,
    phone_valid: phone.length > 0,
    ageYears_valid: !isNaN(ageYears),
    ageMonths_valid: !isNaN(ageMonths)
  });

  const validationFailed = (full_name.length === 0 || isNaN(ageYears) || isNaN(ageMonths) || city.length === 0 || phone.length === 0);
  console.log('Validation failed:', validationFailed, { full_name, ageYears, ageMonths, city, phone });

  if (validationFailed) {
    console.log('Missing required booking fields:', req.body);
    return res.status(400).json({ error: 'Missing required booking fields.' });
  }
  // Calculate child_age as decimal years
  const child_age = ageYears + (ageMonths / 12);
  const stmt = db.prepare('INSERT INTO bookings (full_name, child_age, city, phone, message) VALUES (?, ?, ?, ?, ?)');
  stmt.run(full_name, child_age, city, phone, message || null, function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error.' });
    }
    console.log('Booking inserted with ID:', this.lastID);
    res.status(201).json({ message: 'Booking submitted successfully.', bookingId: this.lastID });
  });
  stmt.finalize();
});

// Admin interface to view bookings
app.get('/admin/bookings', (req, res) => {
  db.all('SELECT * FROM bookings ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).send('Database error.');
    }
    // Function to convert UTC datetime string to Asia/Kolkata timezone string
    function convertToIST(utcDateTimeStr) {
      const utcDate = new Date(utcDateTimeStr + 'Z'); // treat as UTC
      // IST offset is +5:30 (330 minutes)
      const istOffset = 330; // in minutes
      const istDate = new Date(utcDate.getTime() + istOffset * 60000);
      // Format date as YYYY-MM-DD HH:mm:ss
      const year = istDate.getFullYear();
      const month = String(istDate.getMonth() + 1).padStart(2, '0');
      const day = String(istDate.getDate()).padStart(2, '0');
      const hours = String(istDate.getHours()).padStart(2, '0');
      const minutes = String(istDate.getMinutes()).padStart(2, '0');
      const seconds = String(istDate.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    let html = '';
    html += '<html lang="en"><head><title>Booking Submissions - Admin</title>';
    html += '<meta name="viewport" content="width=device-width, initial-scale=1" />';
    html += '<script src="https://cdn.tailwindcss.com"></script>';
    html += '</head><body class="bg-gray-50 min-h-screen p-6">';
    html += '<div class="max-w-7xl mx-auto bg-white p-6 rounded-lg shadow">';
    html += '<h1 class="text-2xl font-bold mb-6">Booking Submissions</h1>';
    html += '<div class="overflow-x-auto">';
    html += '<table class="min-w-full divide-y divide-gray-200">';
    html += '<thead class="bg-gray-100">';
    html += '<tr>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Child Age</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile No.</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>';
    html += '<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted At</th>';
    html += '</tr></thead><tbody class="bg-white divide-y divide-gray-200">';
    rows.forEach(row => {
      html += '<tr>';
      html += '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">' + row.id + '</td>';
      html += '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">' + row.full_name + '</td>';
      html += '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">' + row.child_age.toFixed(1) + '</td>';
      html += '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">' + row.city + '</td>';
      html += '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">' + row.phone + '</td>';
      html += '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">' + (row.message || '') + '</td>';
      html += '<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">' + new Date(row.created_at + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div></div></body></html>';
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    res.send(html);
  });
});

// Admin interface to view users
app.get('/admin/users', (req, res) => {
  db.all('SELECT * FROM users ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).send('Database error.');
    }
    let html = '';
    html += '<html><head><title>User Profiles - Admin</title><style>';
    html += 'body { font-family: Arial, sans-serif; margin: 20px; }';
    html += 'table { border-collapse: collapse; width: 100%; }';
    html += 'th, td { border: 1px solid #ddd; padding: 8px; }';
    html += 'th { background-color: #f2f2f2; }';
    html += 'tr:hover { background-color: #f5f5f5; }';
    html += '</style></head><body>';
    html += '<h1>User Profiles</h1>';
    html += '<table><thead><tr>';
    html += '<th>ID</th><th>Name</th><th>Email</th><th>Mobile</th><th>Created At</th>';
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
      html += '<tr>';
      html += '<td>' + row.id + '</td>';
      html += '<td>' + (row.name || '') + '</td>';
      html += '<td>' + row.email + '</td>';
      html += '<td>' + (row.mobile || '') + '</td>';
      html += '<td>' + row.created_at + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></body></html>';
    res.send(html);
  });
});
// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on http://localhost:' + PORT);
});
