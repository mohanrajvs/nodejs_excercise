const express = require("express");
const app = express();
const cors = require("cors");
const moment = require("moment");

const {
  insertUsers,
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
    await insertUsers(user);

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
    if (!body.description) {
      return res.status(400).json({ error: "description missing" });
    }
    if (body.duration === undefined || body.duration === null) {
      return res.status(400).json({ error: "duration missing" });
    }

    const duration = parseFloat(body.duration);
    if (isNaN(duration) || duration <= 0) {
      return res.status(400).json({
        error: "Invalid duration: must be a positive number",
      });
    }
    const date = body.date;
    if (date) {
      const isValidDate = moment(date).isValid();
      if (!isValidDate) {
        return res.status(400).json({ error: "Invalid date format" });
      }
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
      date: body.date
        ? formatDate(new Date(body.date))
        : formatDate(new Date()),
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
    const { params, query } = req;
    const { from, to, limit } = query;

    if ((from && !moment(from).isValid()) || (to && !moment(to).isValid())) {
      return res
        .status(400)
        .json({ error: "Invalid date format in 'from' or 'to'" });
    }

    let { items: exercises, count } = await getUserExercises(
      params.id,
      false,
      false,
      limit
    );

    exercises = exercises.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (from || to) {
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;

      exercises = exercises.filter(({ date }) => {
        const exerciseDate = new Date(date);
        return (
          (!fromDate || exerciseDate >= fromDate) &&
          (!toDate || exerciseDate <= toDate)
        );
      });
    }

    const createdExercises = exercises.map(
      ({ userId, exerciseId, duration, description, date }) => ({
        userId,
        exerciseId,
        duration,
        description,
        date,
        date_human: moment(date).format("YYYY-MMM-DD"),
      })
    );
    res.json({ count, logs: createdExercises });
  } catch (error) {
    next(error);
  }
});

app.get("/api/users/:id/logs/:from/:to", async (req, res, next) => {
  try {
    const {
      params: { id, from, to },
    } = req;

    if (!moment(from).isValid() || !moment(to).isValid()) {
      return res
        .status(400)
        .json({ error: "Invalid date format for 'from' or 'to'" });
    }

    if (new Date(from) > new Date(to)) {
      return res
        .status(400)
        .json({ error: "'from' date must be earlier than 'to' date" });
    }

    const { items: exercises, count } = await getUserExercises(id, from, to);
    const createdExercises = exercises.map(
      ({ userId, exerciseId, duration, description, date }) => ({
        userId,
        exerciseId,
        duration,
        description,
        date,
        date_human: moment(date).format("YYYY-MMM-DD"),
      })
    );
    res.json({ count, logs: createdExercises });
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
