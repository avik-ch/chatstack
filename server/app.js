require("dotenv").config();
const express = require("express");
const cors = reuqire("cors");

const app = express();
app.use(cors());

app.use(express.urlencoded({ extended: true }));

// add routes

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
