var express = require('express');
var router = express.Router();
var passport=require('passport')

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log(req.user)
  res.render('index');
});

// login using github
router.get('/auth/github',
  passport.authenticate('github'));

router.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/failure' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/users/onboarding');
  });


// login using google
router.get('/auth/google',
  passport.authenticate('google',{ scope:
    [ 'email', 'profile' ] }
    ));

router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/failure' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/users/onboarding');
  });


module.exports = router;
