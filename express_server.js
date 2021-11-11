const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();
app.use(morgan('short'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
const PORT = 8080;

app.set('view engine', 'ejs');

const users = { 
  "userRandomID": {
    id: "userRandomID", 
    email: "user@example.com", 
    password: "purple-monkey-dinosaur"
  },
 "user2RandomID": {
    id: "user2RandomID", 
    email: "user2@example.com", 
    password: "dishwasher-funk"
  }
}

const urlDatabase = {
  "b2xVn2": {longURL: "http://www.lighthouselabs.ca"},
  "9sm5xK": {longURL: "http://www.google.com"}
};

function generateRandomString() {
  let str = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 6; i++) {
    str += characters.charAt(Math.floor(Math.random() * 62))
  }
  return str;
}

const findEmail = function(email) {
  for (id in users) {
    if (email === users[id].email) {
      return users[id];
    }
  }
  return null;
}

app.get('/', (req, res) => {
  res.send('Hello! Welcome to TinyURL!');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`)
})

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get('/urls', (req, res) => {
  const user_id = req.cookies.user_id;
  const user = users[user_id];
  const templateVars = {
    user: user,
    urls: urlDatabase
  };
  res.render('urls_index', templateVars);
});

// Add new URL
app.get('/urls/new', (req, res) => {
  const user_id = req.cookies.user_id;
  // Only registered and logged in user can add new urls
  if (!user_id) {
    res.redirect('/login')
  }
  const user = users[user_id];
  const templateVars = {
    user: user
  }
  res.render('urls_new', templateVars);
});

app.post('/urls', (req, res) => {
  // console.log(req.body);
  // res.send('Ok');
  const user_id = req.cookies.user_id;
  const longURL = req.body.longURL;
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {};
  urlDatabase[shortURL].longURL = longURL;
  urlDatabase[shortURL].userID = user_id;
  // console.log(urlDatabase); // for checking
  res.redirect(`/urls/${shortURL}`);
})

app.get('/urls/:shortURL', (req, res) => {
  const user_id = req.cookies.user_id;
  const user = users[user_id];
  const templateVars = {
    user: user,
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL
  };
  res.render('urls_show', templateVars);
});

app.get('/u/:shortURL', (req, res) => {
  console.log(urlDatabase)
  const shortURL = req.params.shortURL;
  if (!Object.keys(urlDatabase).includes(shortURL)) {
    res.send('Short URL does not exist!')
  }
  const longURL = urlDatabase[shortURL].longURL;
  res.redirect(longURL);
})

// Delete
app.post('/urls/:shortURL/delete', (req, res) => {
  const shortURL = req.params.shortURL;
  delete urlDatabase[shortURL].longURL;
  res.redirect('/urls');
})

// Update
app.post('/urls/:shortURL', (req, res) => {
  const shortURL = req.params.shortURL;
  const longURL = req.body.longURL;
  urlDatabase[shortURL].longURL = longURL;
  res.redirect('/urls');
})

// Login
app.get('/login', (req, res) => {
  const user_id = req.cookies.user_id;
  // redirecting when logged in
  if (user_id) {
    res.redirect('/urls')
  }
  const user = users[user_id];
  const templateVars = {
    user: user
  }
  res.render("login", templateVars);
})

app.post('/login', (req, res) => {
  console.log('req.body post in login', req.body);
  const user = findEmail(req.body.email);
  if (user) {
    if (req.body.password === user.password) {
      res.cookie('user_id', user.id);
      res.redirect('/urls');
    } else {
      res.status('403');
      res.send('Login failed! Password does not match!')
    }
  } else {
    res.status('403');
    res.send(`Login failed! ${req.body.email} not found`);
  }
})

// Logout
app.post('/logout', (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/urls');
})

// Register
app.get('/register', (req, res) => {
  const user_id = req.cookies.user_id;
  const user = users[user_id];
  const templateVars = {
    user: user
  }
  res.render('register', templateVars);
})

app.post('/register', (req, res) => {
  // console.log(req.body);
  if (req.body.email === '' || req.body.password === '') {
    res.status(400);
    res.send('Error: Please input a valid email or password');
  } else if (findEmail(req.body.email)) {
    res.status(400);
    res.send(`${req.body.email} has already been registered!`)
  } else {
    const user = {};
    const id = generateRandomString();
    const email = req.body.email;
    const password = req.body.password;
    users[id] = user;
    user.id = id;
    user.email = email;
    user.password = password;
    // console.log('users: ', users);
    res.cookie('user_id', id);
    res.redirect('/urls');
  }
})