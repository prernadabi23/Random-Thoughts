require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

// console.log(process.env.API_KEY);

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set('strictQuery', true);
// mongoose.connect("mogodb://localhost:27017/userDB",{useNewUrlParser : false});
mongoose.connect("mongodb://0.0.0.0:27017/userDB", {
   useNewUrlParser: true,
   useUnifiedTopology: true
});

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  password: String

});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, {secret: process.env.SECRET , encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user , done){
  done(null, user.id);
});

passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user){
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/passwords",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/passwords",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/passwords");
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/passwords", function(req, res){
  User.find({"password":{$ne: null}}, function(err, foundUsers){
    if(err){
          console.log(err);
     } else{
           if (foundUsers){
             res.render("passwords", {usersWithPasswords: foundUsers});
    }
  }
});
});

// app.get("/logout", function(req, res){
//   req.logout();
//   res.redirect("/");
// });

app.get("/submit", function(req ,res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else{
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const submittedPassword = req.body.password;

  // console.log(req.user.id );

  User.findById(req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
    } else{
      if(foundUser){
        foundUser.password = submittedPassword;
        foundUser.save(function(){
          res.redirect("/passwords");
        });
      }
    }
  });
});

app.get("/logout", (req, res) => {
  req.logout(req.user, err => {
    if(err) return next(err);
    res.redirect("/");
  });
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password , function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    } else{
      passport.authenticate("local")(req, res , function(){
        res.redirect("/passwords");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user =  new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    } else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/passwords");
      });
    }
  });
});

app.listen(3000, function(){
  console.log("Server is running on port 3000!");
});
