const express = require('express'); // Import the express library
const cors = require('cors'); // Import the CORS middleware
const app = express(); // Create an Express application instance
app.use(express.json()); // Middleware to parse JSON request bodies
app.use(cors()); // Enable CORS for all routes
const PORT = process.env.PORT || 3000; // Define the port, use environment variable or default to 3000


const sqlite3 = require('sqlite3').verbose(); // Import sqlite3 and enable verbose mode for better error messages
const db = new sqlite3.Database('./todos.db', (err) => { // Create or open the database file 'todos.db'
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Create the 'todos' table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed BOOLEAN DEFAULT 0
    )`, (err) => {
      if (err) {
        console.error('Error creating todos table:', err.message);
      } else {
        console.log('Todos table created or already exists.');

        // --- NEW CODE STARTS HERE ---
        // Add priority column if it doesn't exist
        db.run(`ALTER TABLE todos ADD COLUMN priority INTEGER DEFAULT 0`, (err) => {
            if (err) {
                // Ignore "duplicate column name" error, as it means column already exists
                if (!err.message.includes('duplicate column name')) {
                    console.error('Error adding priority column:', err.message);
                }
            } else {
                console.log('Priority column added to todos table.');
            }
        });
        // --- NEW CODE ENDS HERE ---
      }
    });
  }
});


app.use(express.json()); // Middleware to parse JSON request bodies


// Define a basic route for the root URL ("/")
app.get('/', (req, res) => {
  res.send('Hello from your TODO backend!');
});




// GET all todos
app.get('/todos', (req, res) => {
  const sql = 'SELECT id, title, completed, priority FROM todos'; // Select specific columns including priority
  db.all(sql, [], (err, rows) => { // Execute the query
    if (err) {
      res.status(500).json({"error": err.message}); // Send a 500 error if something goes wrong
      return;
    }
    res.json(rows); // Send the retrieved todos as JSON
  });
});


// POST a new todo
app.post('/todos', (req, res) => {
  const { title, priority } = req.body; // Extract title and priority

  // Basic validation: ensure title is provided
  if (!title) {
    return res.status(400).json({ "error": "Title is required" });
  }

  const sql = `INSERT INTO todos (title, completed, priority) VALUES (?, ?, ?)`;
  db.run(sql, [title, 0, priority || 0], function(err) { // Add priority, default to 0 if not provided
    if (err) {
      res.status(500).json({"error": err.message});
      return;
    }
    res.status(201).json({ // Send back the newly created todo
  id: this.lastID, // Get the ID of the newly inserted row
  title: title,
  completed: 0,
  priority: priority || 0 // Include priority in the response
});
  });
});


// PATCH an existing todo
app.patch('/todos/:id', (req, res) => {
  const { id } = req.params; // Get the todo ID from the URL parameter
  const { title, completed, priority } = req.body; // Get title, completed, and priority from request body

  // Initialize arrays for dynamic query building
  let updates = [];
  let params = [];

  // Add fields to update if they are provided
  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }

  if (completed !== undefined) {
    updates.push('completed = ?');
    params.push(completed ? 1 : 0); // Convert boolean to 0 or 1 for SQLite
  }

  if (priority !== undefined) {
    updates.push('priority = ?');
    params.push(priority);
  }

  // If no fields were provided for update, send a 400 error
  if (updates.length === 0) {
    return res.status(400).json({ "error": "No fields to update provided." });
  }

  // Add the ID to the parameters for the WHERE clause at the end
  params.push(id);

  // Construct the SQL query
  const sql = `UPDATE todos SET ${updates.join(', ')} WHERE id = ?`;

  // Execute the update query
  db.run(sql, params, function(err) {
    if (err) {
      res.status(500).json({ "error": err.message });
      return;
    }
    if (this.changes === 0) { // 'this.changes' tells us how many rows were affected
      res.status(404).json({ "error": "Todo not found." });
    } else {
      // You could fetch the updated todo here, but for simplicity, we'll just confirm success
      res.status(200).json({ message: "Todo updated successfully", changes: this.changes });
    }
  });
});


// DELETE a todo
app.delete('/todos/:id', (req, res) => {
  const { id } = req.params; // Get the todo ID from the URL parameter

  const sql = `DELETE FROM todos WHERE id = ?`;
  db.run(sql, id, function(err) {
    if (err) {
      res.status(500).json({ "error": err.message });
      return;
    }
    if (this.changes === 0) { // Check if any row was actually deleted
      res.status(404).json({ "error": "Todo not found." });
    } else {
      res.status(200).json({ message: "Todo deleted successfully", changes: this.changes });
    }
  });
});


// Start the server and listen for incoming requests
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});