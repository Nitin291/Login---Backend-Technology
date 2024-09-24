const cookieParser = require("cookie-parser");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
const userModel = require('./models/user');
const postModel = require('./models/post');

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/register", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/profile", isLoggedIn, async (req, res) => {
  const user = await userModel.findById(req.user.userid);
  const posts = await postModel.find({ user: user._id }).sort({ createdAt: -1 }); // Fetch posts sorted by creation date
  res.render("profile", { user, posts });
});

app.post("/register", async (req, res) => {
  let { name, username, email, age, password } = req.body;
  let user = await userModel.findOne({ email });
  if (user) return res.status(500).send("user already registered");

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      let user = await userModel.create({
        username,
        email,
        age,
        name,
        password: hash
      });

      let token = jwt.sign({ email: email, userid: user._id }, "shhh");
      res.cookie("token", token);
      res.send("registered");
    });
  });
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;
  let user = await userModel.findOne({ email });
  if (!user) return res.status(500).send("something went wrong");

  bcrypt.compare(password, user.password, function (err, result) {
    if (result) {
      let token = jwt.sign({ email: email, userid: user._id }, "shhh");
      res.cookie("token", token);
      res.status(200).redirect("/profile");
    } else {
      res.redirect("/login");
    }
  });
});

app.post("/profile", isLoggedIn, async (req, res) => {
  const user = await userModel.findById(req.user.userid);
  const { content } = req.body;

  // Save the post to the database
  await postModel.create({ content, user: user._id });

  // Redirect back to the profile page
  res.redirect("/profile");
});
app.get("/edit-post/:id", isLoggedIn, async function(req, res) {
  const post = await postModel.findOne({ _id: req.params.id, userId: req.user.userid });
  if (!post) return res.status(404).send("Post not found");
  res.render("edit-post", { post });
});

app.post("/edit-post/:id", isLoggedIn, async function(req, res) {
  const { content } = req.body;
  await postModel.findOneAndUpdate({ _id: req.params.id, userId: req.user.userid }, { content });
  res.redirect("/profile");
});

app.get("/delete-post/:id", isLoggedIn, async function(req, res) {
  try {
    
    const postId = req.params.id;

 
    await postModel.findByIdAndDelete(postId);

    
    res.redirect("/profile");
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).send("Internal Server Error");
  }
});


app.get("/logout", function (req, res) {
  res.cookie("token", "");
  res.redirect("/login");
});

function isLoggedIn(req, res, next) {
  if (req.cookies.token === "") {
    res.send("you must be logged in first");
  } else {
    let data = jwt.verify(req.cookies.token, "shhh");
    req.user = data;
    next();
  }
}

app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");
});
