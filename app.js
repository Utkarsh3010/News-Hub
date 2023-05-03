require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local');
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate');
const axios=require('axios');
const https = require('https');
const app = express();

let posts=[];
// let newsTitle;
// let newsDes;
// let newsImg;
let articles=[];
let title;
let description;
let imageUrl;

app.use(express.static("public"));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Secret",
  resave:true,
  saveUninitialized:true,
  cookie:{ }
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1/appuserDB",{useNewUrlParser:true});
const userSchema = new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User',userSchema);

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(new GoogleStrategy({
  clientID:process.env.CLIENT_ID,
  clientSecret:process.env.CLIENT_SECRET,
  callbackURL:"http://localhost:3000/auth/google/newspage"
},
function(acessToken,refreshToken,profile,cb){
  User.findOrCreate({google:profile.id},function(err,user){
    return cb(err,user);
  })
}
))

app.get("/",function(req,res){
  res.render('home');
});

app.get("/auth/google",
  passport.authenticate('google',{scope:['profile']})
);

app.get('/auth/google/newspage',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/newspage');
  });

app.get("/login",function(req,res){
  res.render('login');
});

app.get("/compose",function(req,res){
  if(req.isAuthenticated()){
    res.render('compose');
  }
  else{
    res.redirect("/login");
  }
});
const url = 'https://newsapi.org/v2/top-headlines';
const params = {
  country: 'us',
  apiKey: '90f203ed12634c6980159699805565d0',
  pageSize: 10,
  category: 'technology',
  language: 'en',
  sortBy: 'publishedAt',
  title: 'title',
  description: 'description',
  urlToImage: 'urlToImage'
};
app.get("/newspage",function(req,res){
axios.get(url, { params })
    .then(response => {
         articles = response.data.articles;
        articles.forEach(article => {
             title = article.title;
             description = article.description;
             imageUrl = article.urlToImage;
            //console.log({ title, description, imageUrl });
        });
    })
    .catch(error => {
        console.log(error);
    });

  User.find({"newspage":{$ne:null}}, function(err,founduser){
    if(err){
      console.log(err);
    }else{
      if(founduser){
        res.render("newspage",{
          userWithSecrets:founduser,
          articles:articles,
          posts:posts,
          title:title,
          imageUrl:imageUrl,
          description:description,
        });
      }
    }
  });
});
app.get("/newspage/compose",function(req,res){
  if(req.isAuthenticated()){
    res.render('compose');
  }
  else{
    res.redirect("/login");
  }
});
app.get("/signup",function(req,res){
  res.render('signup');
});

app.get("/contact",function(req,res){
  res.render('contact');
});

app.get("/aboutUs",function(req,res){
  res.render('aboutUs');
});

app.post("/compose",function(req,res){
  const post={
    title:req.body.TitleBody,
    content:req.body.PostBody
  };
  posts.push(post);
  res.redirect("/newspage");
});
app.post("/newspage/compose",function(req,res){
  const post={
    title:req.body.TitleBody,
    content:req.body.PostBody
  };
  posts.push(post);
  res.redirect("/newspage");
});

app.post("/signup",function(req,res){
  User.register({username:req.body.usename}, req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/signup");
    }
    else{
      passport.authenticate("local")(res,req,function(){
        res.redirect("/newspage");
      })
    }
  })
});

app.post("/login",function(req,res){
  const user=new User({
    username:req.body.usename,
    password:req.body.password
  });
  req.login(user,function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/newspage");
      });
    }
  });
});

app.listen(3000,function(){
  console.log("Server Running on Port 3000!");
});
