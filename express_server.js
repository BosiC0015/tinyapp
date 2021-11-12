const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const app = express();
app.use(morgan('short'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(cookieSession({
  name: 'session',
  keys: ['Security more and more', 'This is key2'],
}));
const PORT = 8080;

app.set('view engine', 'ejs');

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    hashedPassword: bcrypt.hashSync("purple", 10)
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    hashedPassword: bcrypt.hashSync("dish", 10)
  }
};

const urlDatabase = {
  "b2xVn2": {longURL: "http://www.lighthouselabs.ca", userID: 'userRandomID'},
  "9sm5xK": {longURL: "http://www.google.com", userID: 'userRandomID'}
};

const generateRandomString = function(num) {
  let str = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < num; i++) {
    str += characters.charAt(Math.floor(Math.random() * 62));
  }
  return str;
};

const { getUserByEmail } = require('./helper');

const urlsForUser = function(id) {
  const result = {};
  const keys = Object.keys(urlDatabase);
  for (const shortURL of keys) {
    const urlOfUserID = urlDatabase[shortURL];
    if (id === urlOfUserID.userID) {
      result[shortURL] = urlOfUserID;
    }
  }
  return result;
};

app.get('/', (req, res) => {
  const user_id = req.session.user_id;
  const user = users[user_id];
  if (user) {
    res.redirect('/urls');
  }
  res.redirect('/login');
});

// GET urls
app.get('/urls', (req, res) => {
  const user_id = req.session.user_id;
  const user = users[user_id];
  if (!user) {
    res.status(400).send('Please <a href="/login">login</a>');
  }
  const urlOfUser = urlsForUser(user_id);
  // console.log(urlOfUser); // for checking
  const templateVars = {
    user,
    urls: urlOfUser
  };
  res.render('urls_index', templateVars);
});

// GET /url/new
app.get('/urls/new', (req, res) => {
  const user_id = req.session.user_id;
  // Only registered and logged in user can add new urls
  if (!user_id) {
    res.redirect('/login');
  }
  const user = users[user_id];
  const templateVars = { user };
  res.render('urls_new', templateVars);
});

app.post('/urls', (req, res) => {
  const user_id = req.session.user_id;
  // Only registered and logged in user can add new urls
  if (!user_id) {
    res.send('You should be <a href="/login">logged in</a> to genereate a short url!');
  }
  const longURL = req.body.longURL;
  const shortURL = generateRandomString(6);
  urlDatabase[shortURL] = {};
  urlDatabase[shortURL].longURL = longURL;
  urlDatabase[shortURL].userID = user_id;
  res.redirect(`/urls/${shortURL}`);
});

app.get('/urls/:shortURL', (req, res) => {
  const user_id = req.session.user_id;
  // if user not logged in
  if (!user_id) {
    res.send('Please <a href="/login">Log in</a>');
  }
  const user = users[user_id];
  const shortURL = req.params.shortURL;
  const urlOfUserID = urlsForUser(user_id);
  // if short url for the user ID does not exist
  if (!Object.keys(urlDatabase).includes(shortURL)) {
    res.send('URL does not exist! Please <a href="/urls">try again</a>.');
  }
  // if user is logged it but does not own the URL with the given ID
  if (!Object.keys(urlOfUserID).includes(shortURL)) {
    res.send('You does not own the short URL! Please <a href="/urls">try again</a>.');
  }
  const longURL = urlOfUserID[shortURL].longURL;
  const templateVars = { user, shortURL, longURL };
  res.render('urls_show', templateVars);
});

app.get('/u/:shortURL', (req, res) => {
  const shortURL = req.params.shortURL;
  if (!Object.keys(urlDatabase).includes(shortURL)) {
    res.send('Short URL does not exist! Please <a href="/urls">try again</a>.');
  }
  const longURL = urlDatabase[shortURL].longURL;
  res.redirect(longURL);
});

// Update
app.post('/urls/:shortURL', (req, res) => {
  const user_id = req.session.user_id;
  // update is only for login users
  if (!user_id) {
    res.redirect('/login');
  }
  // if user is logged it but does not own the URL for the given ID
  const shortURL = req.params.shortURL;
  const urlOfUserID = urlsForUser(user_id);
  if (!Object.keys(urlOfUserID).includes(shortURL)) {
    res.send('You does not own the short URL! Please <a href="/urls">try again</a>.');
  }
  const longURL = req.body.longURL;
  urlDatabase[shortURL].longURL = longURL;
  res.redirect('/urls');
});

// Delete
app.post('/urls/:shortURL/delete', (req, res) => {
  const user_id = req.session.user_id;
  const shortURL = req.params.shortURL;
  if (!user_id) {
    res.send('Please <a href="/login">Log in</a>');
  }
  const urlOfUserID = urlsForUser(user_id);
  if (!Object.keys(urlOfUserID).includes(shortURL)) {
    res.send('You does not own the short URL! Please <a href="/urls">try again</a>.');
  }
  delete urlDatabase[shortURL];
  delete urlOfUserID[shortURL];
  res.redirect('/urls');
});

// Login
app.get('/login', (req, res) => {
  const user_id = req.session.user_id;
  // console.log(user_id)
  // redirecting when logged in
  if (user_id) {
    res.redirect('/urls');
  }
  const user = users[user_id];
  const templateVars = { user };
  res.render("login", templateVars);
});

app.post('/login', (req, res) => {
  const user = getUserByEmail(req.body.email, users);
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);
  if (user) {
    if (bcrypt.compareSync(password, hashedPassword)) {
      req.session.user_id = user.id;
      res.redirect('/urls');
    } else {
      res.status('403');
      res.send('Login failed! Wrong Password!');
    }
  } else {
    res.status('403');
    res.send(`Login failed! User ${req.body.email} not found`);
  }
});

// Logout
app.post('/logout', (req, res) => {
  // userDatabase += userUrlDB;
  // res.clearCookie('user_id');
  req.session = null;
  res.redirect('/urls');
});

// Register
app.get('/register', (req, res) => {
  const user_id = req.session.user_id;
  // redirecting when logged in
  if (user_id) {
    res.redirect('/urls');
  }
  const user = users[user_id];
  const templateVars = {
    user: user
  };
  res.render('register', templateVars);
});

app.post('/register', (req, res) => {
  // console.log(req.body);
  const email = req.body.email;
  const password = req.body.password;
  if (email === '' || password === '') {
    res.status(400);
    res.send('Error: Please input a valid email or password');
  } else if (getUserByEmail(req.body.email, users)) {
    res.status(400);
    res.send(`${req.body.email} has already been registered!`);
  } else {
    const user = {};
    const id = generateRandomString(6);
    const hashedPassword = bcrypt.hashSync(password, 10);
    users[id] = user;
    user.id = id;
    user.email = email;
    // user.password = password; <-- no password needed anymore
    user.hashedPassword = hashedPassword;
    // console.log('users: ', users); // for checking
    req.session.user_id = id;
    res.redirect('/urls');
  }
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});