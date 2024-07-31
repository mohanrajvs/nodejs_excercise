const sqlite3 = require("sqlite3").verbose();

const connectDB = () => {
  const db = new sqlite3.Database("./mydatabase.db", (err) => {
    if (err) {
      console.error(err.message);
    }
  });
  return db;
};

const closeDB = (db) => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
  });
};

exports.checkIfTableExists = (tableName) => {
  const db = connectDB();
  return new Promise((resolve, reject) => {
    const query = `SELECT name FROM sqlite_master WHERE type='table' AND name=?`;
    db.get(query, [tableName], (err, row) => {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        resolve(!!row);
      }
      closeDB(db);
    });
  });
};

exports.inserUsers = (user) => {
  const db = connectDB();
  const { username, id } = user;
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT
  )`,
      (err) => {
        if (err) {
          console.error(err);
        }
        console.log("user table created");
      }
    );
  });
  const stmt = db.prepare("INSERT INTO users (username, id) VALUES (?, ?)");
  stmt.run(username, id);
  stmt.finalize();

  closeDB(db);
};

exports.insertExercise = (exercise) => {
  const db = connectDB();
  const { userId, duration, description, date } = exercise;
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS exercise(
            exerciseId INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            duration INTEGER,
            description TEXT,
            date TEXT
            )`
    );
  });

  const stmt = db.prepare(
    "INSERT INTO exercise (userId, duration, description, date) VALUES (?, ?, ?, ?)"
  );
  stmt.run(userId, duration, description, date);
  stmt.finalize();
  db.close();
};

exports.getAllUsers = () => {
  const db = connectDB();
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        resolve(rows);
      }
      closeDB(db);
    });
  });
};

exports.getAllExercises = (callback) => {
  const db = connectDB();
  db.all("SELECT * FROM exercise", [], (err, rows) => {
    if (err) {
      console.error(err.message);
      callback(err, null);
    } else {
      callback(null, rows);
    }
  });

  closeDB(db);
};

exports.getUserExercises = async (
  id = false,
  fromDate = false,
  toDate = false
) => {
  const db = connectDB();

  let query = `
  SELECT * 
  FROM users 
  JOIN exercise ON users.id = exercise.userId
`;

  const params = [];

  if (id) {
    query += ` WHERE users.id = ?`;
    params.push(id);
  }

  if (fromDate) {
    if (params.length > 0) {
      query += ` AND exercise.date >= ?`;
    } else {
      query += ` WHERE exercise.date >= ?`;
    }
    params.push(fromDate);
  }

  if (toDate) {
    if (params.length > 0) {
      query += ` AND exercise.date <= ?`;
    } else {
      query += ` WHERE exercise.date <= ?`;
    }
    params.push(toDate);
  }

  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        resolve(rows);
      }
      closeDB(db);
    });
  });
};
