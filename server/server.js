// npm modules
const express = require('express')
const uuid = require('uuid/v4')
const session = require('express-session')
const FileStore = require('session-file-store')(session)
const bodyParser = require('body-parser')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const axios = require('axios')
const bcrypt = require('bcrypt-nodejs')

const users = [
  { id: '3lfjapa', email: 'test@test.com', password: 'password' }
]

// configure passport.js to use the local strategy
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  (email, password, done) => {
    axios.get(`http://localhost:5000/users?email=${email}`)
      .then(res => {
        const user = res.data[0]

        if (!user) {
          return done(null, false, { message: 'Invalid credentials.\n' })
        }

        if (!bcrypt.compareSync(password, user.password)) {
          return done(null, false, { message: 'Invalid credentials.\n' })
        }

        return done(null, user)
      })
      .catch(err => done(err))
  }
))

// tell passport how to serialize the user
passport.serializeUser((user, done) => {
  console.log('Inside serializeUser callback. User id is save to the session File Store here')
  done(null, user.id)
})

passport.deserializeUser((id, done) => {
  axios.get(`http://localhost:5000/users/${id}`)
    .then(res => done(null, res.data))
    .catch(err => done(err, false))
})

// create the server
const app = express()
// initiated express router
const loginRouter = express.Router()

// add & configure middleware
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(session({
  genid(req) {
    console.log('Inside the session middleware')
    console.log(req.sessionID)

    return uuid()
  },
  store: new FileStore(),
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}))

app.use(passport.initialize())
app.use(passport.session())

// create the homepage route at '/'
app.get('/', (req, res) => {
  console.log('Inside the home page callback function')
  console.log(req.sessionID)
  res.send('You hit home page!\n')
})

loginRouter.route('/login')
  .get((req, res) => {
    console.log('Inside GET /login callback function')
    console.log(req.sessionID)
    res.send('You got the login page!\n')
  })
  .post((req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (info) return res.send(info.message)
      if (err) return next(err)
      if (!user) return res.redirect('/login')

      req.login(user, (err) => {
        if (err) return next(err)

        return res.redirect('/authrequired')
      })
    })(req, res, next)
  })

app.use(loginRouter)

app.get('/authrequired', (req, res) => {
  console.log('Inside GET /authrequired callback')
  console.log(`User autheticated? ${req.isAuthenticated()}`);
  if (req.isAuthenticated()) {
    res.send('You hit the authentication endpoint\n')
  } else {
    res.redirect('/')
  }
})

// tell the server what port to listen on
app.listen(3000, () => {
  console.log('Listening on http://localhost:3000')
})
