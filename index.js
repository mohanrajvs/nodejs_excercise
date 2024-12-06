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

app.post("/api/users", async (req, res, next) => {
  try {
    const { username } = req.body;

    if (!username || username.trim().length < 1) {
      return res.status(400).json({ error: "Username is required" });
    }

    const userTableExist = await checkIfTableExists("users");
    if (userTableExist) {
      const users = await getAllUsers();
      const usernameExist = users.find((user) => user.username === username);
      if (usernameExist) {
        return res.status(409).json({ error: "Username already exists" });
      }
    }

    const user = { username, id: Date.now() };
    await inserUsers(user);

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

app.get("/api/users", async (req, res, next) => {
  try {
    const users = await getAllUsers();
    if (users.length === 0) {
      return res.status(404).json({ error: "No users found" });
    }
    res.json(users);
  } catch (error) {
    next(error);
  }
});

app.post("/api/users/:id/exercises", async (req, res, next) => {
  try {
    const { params, body } = req;
    if (!body.duration || !body.description) {
      return res.status(400).json({ error: "Bad request" });
    }

    const users = await getAllUsers();
    const userFromDb = users.find((user) => user.id == params.id);
    if (!userFromDb) {
      return res
        .status(404)
        .json({ error: `No user found for the ID ${params.id}` });
    }

    const exercise = {
      userId: params.id,
      duration: body.duration,
      description: body.description,
      date: body.date || formatDate(new Date()),
    };
    await insertExercise(exercise);
    res.status(201).json(exercise);
  } catch (error) {
    next(error);
  }
});

app.get("/api/exercises", async (req, res, next) => {
  try {
    const exercises = await getAllExercises();
    if (exercises.length === 0) {
      return res.status(404).json({ error: "No exercises found" });
    }
    res.json(exercises);
  } catch (error) {
    next(error);
  }
});

app.get("/api/users/:id/logs", async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
});

app.get("/api/users/:id/logs/:from/:to", async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: "Internal Server Error",
    details: err.message,
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
