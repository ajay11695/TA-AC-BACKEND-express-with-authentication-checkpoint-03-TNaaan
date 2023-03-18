var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var session=require('express-session')
var flash=require('connect-flash')
var MongoStore=require('connect-mongo')
var auth=require('./middleware/auth')
var passport=require('passport')
require('dotenv').config()
require('./module/passport')

// connect database
mongoose.connect('mongodb://localhost/Expense-Tracker')
.then(console.log('connected'))
.catch((err)=>{console.log(err)})

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// set session middleware
app.use(session({
  secret:process.env.SECRET,
  resave:false,
  saveUninitialized:false,
  store: new MongoStore({mongoUrl: 'mongodb://localhost/Expense-Tracker'})
}))

// add flash
app.use(flash())


// use passport
app.use(passport.initialize())
app.use(passport.session())

// user information
app.use(auth.userInfo)

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
