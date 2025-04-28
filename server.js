const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors({
  origin: "http://localhost:3000", // Frontend
  credentials: true
}));

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Rahul@123@123",
  database: "employee_portal"
});

db.connect(err => {
  if (err) console.error("Database connection failed:", err);
  else console.log("Database connected...");
});

// Login Route
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.query("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send({ success: false, message: "Server error" });
    } else {
      if (result.length > 0) res.send({ success: true });
      else res.send({ success: false });
    }
  });
});

// Fetch employees
app.get("/employees", (req, res) => {
  db.query("SELECT * FROM employees", (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send({ message: "Error fetching employees" });
    } else {
      res.send(result);
    }
  });
});

// Add new employee
app.post("/add-employee", (req, res) => {
  const { name, employee_id } = req.body;
  db.query("INSERT INTO employees (name, employee_id) VALUES (?, ?)", [name, employee_id], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send({ success: false, message: "Error adding employee" });
    } else {
      res.send({ success: true });
    }
  });
});

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Upload document
app.post("/upload-document", upload.single("file"), (req, res) => {
  const { employee_id, document_type } = req.body;
  const file_path = req.file.path;

  db.query(
    "INSERT INTO documents (employee_id, document_type, file_path) VALUES (?, ?, ?)",
    [employee_id, document_type, file_path],
    (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send({ message: "Error uploading document" });
      } else {
        res.send({ success: true });
      }
    }
  );
});

// Fetch documents for a single employee
app.get("/documents/:employee_id", (req, res) => {
  const { employee_id } = req.params;
  db.query(
    "SELECT * FROM documents WHERE employee_id = ?",
    [employee_id],
    (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send({ message: "Error fetching documents" });
      } else {
        res.send(result);
      }
    }
  );
});

// Fetch all documents with employee name
app.get("/all-documents", (req, res) => {
  db.query(
    `SELECT d.*, e.name AS employee_name 
     FROM documents d 
     JOIN employees e ON d.employee_id = e.employee_id`,
    (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send({ message: "Error fetching all documents" });
      } else {
        res.send(result);
      }
    }
  );
});

// 🆕 Fetch all employees + their document status
// New API: Fetch all employees and their documents
app.get("/all-documents", (req, res) => {
  const query = `
    SELECT e.id as employee_id, e.name as employee_name, d.document_type
    FROM employees e
    LEFT JOIN documents d ON e.employee_id = d.employee_id
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send({ message: "Error fetching all documents" });
    } else {
      res.send(result);
    }
  });
});


// Delete document
app.delete("/delete-document/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT file_path FROM documents WHERE id = ?", [id], (err, result) => {
    if (err || result.length === 0) {
      console.error(err);
      return res.status(500).send({ message: "Error finding document" });
    }

    const filePath = result[0].file_path;

    db.query("DELETE FROM documents WHERE id = ?", [id], (err, result2) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: "Error deleting document" });
      }

      fs.unlink(filePath, (err) => {
        if (err) console.error("Error deleting file:", err);
      });

      res.send({ success: true });
    });
  });
});

// Start server
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
