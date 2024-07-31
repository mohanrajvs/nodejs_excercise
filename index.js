const express = require("express");
const app = express();
const cors = require("cors");
const {
  inserUsers,
  getAllUsers,
  insertExercise,
  getAllExercises,
  getUserExercises,
  checkIfTableExists,
} = require("./db");
const { formatDate } = require("./utility");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async (req, res) => {
  const { username } = req.body;
  const userTableExist = await checkIfTableExists("users");
  if (userTableExist) {
    const users = await getAllUsers();
    const usernameExist = users.find((user) => user.username == username);
    if (usernameExist) {
      res.status(409).json({ error: "username already exist" });
      return;
    }
  }
  const user = { username, id: Date.now() };
  inserUsers(user);
  res.json(JSON.stringify(user));
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await getAllUsers();
    if (users.length == 0) {
      res.status(404).json({ error: "no users found" });
      return;
    }
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Error fetching users" });
  }
});

app.post("/api/users/:id/exercises", async (req, res) => {
  const { params, body } = req;
  if (!body.duration || !body.description) {
    res.status(404).json({ error: "Bad request" });
    return;
  }
  const users = await getAllUsers();
  const userFromDb = users.find((user) => user.id == params.id);
  if (!userFromDb) {
    res.status(401).json({ error: `no user found for the id ${params.id}` });
    return;
  }

  const exercise = {
    userId: params.id,
    duration: body.duration,
    description: body.description,
    date: body.date || formatDate(new Date()),
  };
  insertExercise(exercise);
  res.json(JSON.stringify(exercise));
});

app.get("/api/exercises", (req, res) => {
  getAllExercises((err, exercises) => {
    if (err) {
      res.status(500).json({ error: "Error fetching exercises" });
    } else {
      if (exercises.length == 0) {
        res.status(404).json({ error: "no exercises found" });
      }
      res.json(exercises);
    }
  });
});

app.get("/api/users/:id/logs", async (req, res) => {
  const { params } = req;
  const exercises = await getUserExercises(params.id);
  const createdExercises = exercises.map(
    ({ userId, exerciseId, duration, description, date }) => ({
      userId,
      exerciseId,
      duration,
      description,
      date,
    })
  );
  res.json({ count: createdExercises.length, logs: createdExercises });
});
app.get("/api/users/:id/logs/:from/:to", async (req, res) => {
  const {
    params: { id, from, to },
  } = req;

  const exercises = await getUserExercises(id, from, to);
  const createdExercises = exercises.map(
    ({ userId, exerciseId, duration, description, date }) => ({
      userId,
      exerciseId,
      duration,
      description,
      date,
    })
  );
  res.json({ count: createdExercises.length, logs: createdExercises });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
