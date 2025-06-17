const express = require('express'); // Import the express library
const app = express(); // Create an Express application instance
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
  const sql = 'SELECT * FROM todos'; // SQL query to select all todos
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
  const { title } = req.body; // Extract title from the request body

  // Basic validation: ensure title is provided
  if (!title) {
    return res.status(400).json({ "error": "Title is required" });
  }

  const sql = `INSERT INTO todos (title, completed) VALUES (?, ?)`;
  db.run(sql, [title, 0], function(err) { // 'this.lastID' is available only with 'function(err)'
    if (err) {
      res.status(500).json({"error": err.message});
      return;
    }
    res.status(201).json({ // Send back the newly created todo
      id: this.lastID, // Get the ID of the newly inserted row
      title: title,
      completed: 0
    });
  });
});


// PATCH an existing todo
app.patch('/todos/:id', (req, res) => {
  const { id } = req.params; // Get the todo ID from the URL parameter
  const { title, completed } = req.body; // Get title and completed status from request body

  // Ensure at least one field is provided for update
  if (title === undefined && completed === undefined) {
    return res.status(400).json({ "error": "No fields to update provided." });
  }

  let updates = [];
  let params = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }

  if (completed !== undefined) {
    updates.push('completed = ?');
    params.push(completed ? 1 : 0); // Convert boolean to 0 or 1 for SQLite
  }

  if (updates.length === 0) { // Should be caught by the above check, but good for robustness
    return res.status(400).json({ "error": "No valid fields to update provided." });
  }

  params.push(id); // Add the ID to the parameters for the WHERE clause

  const sql = `UPDATE todos SET ${updates.join(', ')} WHERE id = ?`;

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