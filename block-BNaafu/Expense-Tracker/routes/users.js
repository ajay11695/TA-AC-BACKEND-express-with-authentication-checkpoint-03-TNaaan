var express = require('express');
var router = express.Router();
var passport = require('passport')
let Str = require('@supercharge/strings');
require('dotenv').config();
var Otp = require('../model/Otp');
let nodemailer = require('nodemailer');
var User = require('../model/User')
var auth = require('../middleware/auth')
var Income = require('../model/Income')
var Expense = require('../model/Expense')

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

// registration
router.get('/register', function (req, res, next) {
  var error = req.flash('error')[0]
  res.render('register', { error });
});


router.post('/register', (req, res, next) => {
  // console.log(req.body)
  req.body.emailToken = Str.Str.random(15)
  User.create(req.body)
    .then((user) => {
      // verify the email
      var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL,
          pass: process.env.PASSWORD
        }
      });

      var mailOptions = {
        from: process.env.EMAIL,
        to: user.email,
        subject: 'verify your email',
        html: `
        <h1>Hello </h>
        <p> Thanks for registration on our site.</p>
        <p> Please click the link below to varify your account</p>
        <a href="http://localhost:3000/users/varify-email?token=${user.emailToken}">Varify your account</a>
        `
      };

      console.log(mailOptions)
      transporter.sendMail(mailOptions, function (error, info) {
        console.log(info)
        if (error) {
          console.log(error)
          req.flash('error', 'something went wrong')
          res.redirect('/users/register')
        } else {
          console.log('Email sent: ' + info.response);
          res.redirect('/users/gotoGmail')
        }
      })
    })
    .catch((err) => {
      if (err) {

        if (err.name === 'MongoServerError') {
          req.flash('error', 'This email is taken')
          return res.redirect('/users/register')
        }
        if (err.name === 'ValidationError') {
          req.flash('error', err.message)
          return res.redirect('/users/register')
        }

      }
    })

});

// forEmailverify
router.get('/gotoGmail',(req,res)=>{
  res.render('forEmailverify')
})

//email varification
router.get('/varify-email', async (req, res, next) => {

  try {
    let user = await User.findOne({ emailToken: req.query.token })

    //no user
    if (!user) {
      return res.redirect('/')
    }
    user.emailToken = null,
      user.isVerified = true
    await user.save()
    req.flash('error', 'Varification success')
    return res.redirect('/users/login')

  } catch (error) {
    console.log(error)
    req.flash('error', 'Token is invalid. please contact us for assistance')
    return res.redirect('/users/register')
  }
})

// login
router.get('/login', function (req, res, next) {
  var error = req.flash('error')[0]
  res.render('login', { error });
});


router.post('/login',
  passport.authenticate('local', { failureRedirect: '/users/login', successRedirect: '/users/onboarding', failureFlash: true })
);

// forgot password
router.get('/forgot', function (req, res, next) {
  var error = req.flash('error')[0]
  res.render('sendOtp', { error });
});

router.post('/forgot', (req, res, next) => {
  // all otp deleted
  Otp.deleteMany({}).catch((err) => {
    next(err)
  })

  //  find user
  User.findOne(req.body)
    .then((user) => {
      if (!user) {
        req.flash('error', 'invalid email & please correct email address')
        return res.redirect('/users/forgot')
      }

      // save data otp model
      req.body.code = Math.floor(Math.random() * 9000)
      req.body.expireIn = new Date().getTime() + 300 * 1000
      Otp.create(req.body)
        .then((code) => {
          res.redirect('/users/email/' + code.email)
        })
        .catch((err) => {
          next(err)
        })
    })
})

// sent otp on email
router.get('/email/:email', async (req, res, next) => {
  var email = req.params.email
  var otpData = await Otp.findOne({ email: email })
  console.log(otpData)
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD
    }
  })

  var mailOptions = {
    from: process.env.EMAIL,
    to: otpData.email,
    subject: 'One Time Password (OTP) for Password recovery process on Expense Tracker',
    html: `
        <h1>OTP </h>
        <p>${otpData.code}</p>`
  }

  transporter.sendMail(mailOptions, function (err, info) {
    if (err) {
      req.flash('error', 'Unable send email')
      return res.redirect('/users/forgot')
    } else {
      //varigy otp
      res.redirect('/users/verifyOtp')
    }

  })

})

// verify otp
router.get('/verifyOtp', function (req, res, next) {
  res.render('newPassword');
});

router.post('/verifyOtp', async (req, res, next) => {
  var otpData = await Otp.findOne({ code: req.body.code })
  if (otpData) {
    var currentTime = new Date().getTime()
    var diffTime = otpData.expireIn - currentTime
    if (diffTime > 0) {
      var user = await User.findOne({ email: otpData.email })
      user.password = req.body.password
      await user.save()
      req.flash('error', 'password changed successfully')
      res.redirect('/users/login')
    } else {
      req.flash('error', 'Otp TimeOut')
      res.redirect('/users/forgot')
    }
  }
})


// is user authorized
router.use(auth.loggedInUser)

// logout
router.get('/logout', (req, res) => {
  res.clearCookie('connect.sid')
  req.session.destroy()
  res.redirect('/')
})

// onboarding
router.get('/onboarding', async (req, res, next) => {
  console.log(req.query)
  var mixArr=[]
  var incomeArr=[]
  var expenseArr=[]
  var totalSaving;
  try {
    var user = await User.findById(req.user._id).populate('incomeID').populate('expenseID').exec()
    // console.log(user)
    let { month, category, source, start_date, end_date,saving } = req.query

    // Income detail
    user.incomeID.forEach(income=>{
      mixArr.push(income)
      if(month){
        if(income.date.includes(month)){
          incomeArr.push(income.amount)
        }
      }else{
        var currentMonth=new Date().getMonth()+1
        if(income.date.includes(currentMonth)){
          incomeArr.push(income.amount)
        }
      }
    })

    // expense detail
    user.expenseID.forEach(expense=>{
      mixArr.push(expense)
      if(month){
        if(expense.date.includes(month)){
          expenseArr.push(expense.amount)
        }
      }else{
        var currentMonth=new Date().getMonth()+1
        if(expense.date.includes(currentMonth)){
          expenseArr.push(expense.amount)
        }
      }
    })

    var totalIncome=incomeArr.reduce((acc,cv)=>acc+cv,0)
    var totalExpense=expenseArr.reduce((acc,cv)=>acc+cv,0)
    totalSaving=totalIncome-totalExpense

    var incomes=await Income.distinct('source')
    var expenses=await Expense.distinct('category')

    // console.log(mixArr,incomeArr,expenseArr,incomes,expenses)
    if(month){
      var data=mixArr.filter(ele=>ele.date.includes(month)).sort((a,b)=>a.createdAt-b.createdAt)
      return res.render('onboarding', { totalIncome, totalExpense, totalSaving, data ,incomes,expenses})
    }

    if(source){
      var data=mixArr.filter(ele=>ele.source=== source).sort((a,b)=>a.createdAt-b.createdAt)
      return res.render('onboarding', { totalIncome, totalExpense, totalSaving, data ,incomes,expenses})
    }

    if(category && start_date && end_date){
      var data=mixArr.filter(ele=>ele.category=== category).filter(ele=>ele.date>=start_date && ele.date<=end_date).sort((a,b)=>a.createdAt-b.createdAt)
      return res.render('onboarding', { totalIncome, totalExpense, totalSaving, data ,incomes,expenses})
    }

    if(category){
      var data=mixArr.filter(ele=>ele.category=== category).sort((a,b)=>a.createdAt-b.createdAt)
      return res.render('onboarding', { totalIncome, totalExpense, totalSaving, data ,incomes,expenses})
    }

    if(saving==='All Time'){
      var data=mixArr.sort((a,b)=>a.createdAt-b.createdAt)
      var user=await User.findById(req.user._id).populate('incomeID').populate('expenseID').exec()
      totalIncome=user.incomeID.reduce((acc,cv)=>acc+cv.amount,0)
      totalExpense=user.expenseID.reduce((acc,cv)=>acc+cv.amount,0)
      totalSaving=totalIncome-totalExpense
      return res.render('onboarding', { totalIncome, totalExpense, totalSaving, data ,incomes,expenses})
    }

    var data=mixArr.sort((a,b)=>a.createdAt-b.createdAt)
    res.render('onboarding', { totalIncome, totalExpense, totalSaving, data ,incomes,expenses})

  } catch (error) {
    next(error)
  }

})

// add income
router.get('/income', (req, res, next) => {
  res.render('income')
})

router.post('/income', (req, res, next) => {
  req.body.user_ID = req.user._id
  Income.create(req.body)
    .then((income) => {
      User.findByIdAndUpdate(req.user._id, { $push: { incomeID: income._id } }).then(() => {
        res.redirect('/users/onboarding')
      }).catch((err) => {
        next(err)
      })
    })
})



// add expense
router.get('/expense', (req, res, next) => {
  res.render('expense')
})

router.post('/expense', (req, res, next) => {
  console.log(req.user, req.body)
  req.body.user_ID = req.user._id
  Expense.create(req.body)
    .then((expense) => {
      User.findByIdAndUpdate(req.user._id, { $push: { expenseID: expense._id } }).then(() => {
        res.redirect('/users/onboarding')
      }).catch((err) => {
        next(err)
      })
    })
})

// view incomelist
router.get('/incomelist',async(req,res)=>{
  var user=await User.findById(req.user._id).populate('incomeID').exec()
  var data=user.incomeID
  res.render('incomeList',{data})
})

// view expenselist
router.get('/expenselist',async(req,res)=>{
  var user=await User.findById(req.user._id).populate('expenseID').exec()
  var data=user.expenseID
  res.render('expenseList',{data})
})

module.exports = router;
