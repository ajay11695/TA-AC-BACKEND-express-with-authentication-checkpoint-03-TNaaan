var passport = require('passport')
require('dotenv').config()
var githubStrategy = require('passport-github').Strategy
var googleStrategy = require('passport-google-oauth2').Strategy
var LocalStrategy = require('passport-local').Strategy
var User = require('../model/User')


// login with github
passport.use(new githubStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: '/auth/github/callback'
}, (accessToken, refreshToken, profile, done) => {
    // console.log(profile)
    var githubUser = {
        name:profile.displayName,
        email: profile._json.email,
        providers:[profile.provider],
       github:{
        name: profile.displayName,
        username: profile.username,
        image: profile._json.avatar_url
       }
    }
    User.findOne({ email: profile._json.email })
        .then((user) => {
            // console.log( !user)
            if (!user) {
                User.create(githubUser)
                    .then((adduser) => {
                        console.log(adduser)
                        return done(null, adduser)
                    }).catch((err) => {
                        return done(err,false)
                    })
            }
            if(user.providers.includes(profile.provider)){
                return done(null,user)
            }else{
                user.providers.push(profile.provider)
                user.github={...githubUser.github}
                user.save()
                .then((updateUser)=>{
                    done(null,updateUser)
                })
                .catch((err)=>{
                    done(err)
                })
            }
        })
        .catch((err) => {
            done(err)
        })
}
))

// login with google

passport.use(new googleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
},
    function (accessToken, refreshToken, profile, done) {
        console.log(profile)
        var googleUser ={
            name:profile.displayName,
            email: profile.email,
            providers:[profile.provider],
           google:{
            name: profile.displayName,
            image: profile.picture
           }
        }
        User.findOne({ email: profile.email })
            .then((user) => {
                console.log( !user)
                if (!user) {
                    User.create(googleUser)
                        .then((adduser) => {
                            console.log(adduser)
                            return done(null, adduser)
                        }).catch((err) => {
                            return done(err)
                        })
                }
                console.log(user.providers.includes(profile.provider))
                if(user.providers.includes(profile.provider)){
                    return done(null,user)
                }else{
                    user.providers.push(profile.provider)
                    user.google={...googleUser.google}
                    user.save()
                    .then((updateUser)=>{
                        done(null,updateUser)
                    })
                    .catch((err)=>{
                        done(err)
                    })
                
                }
                
            })
            .catch((err) => {
                done(err)
            })
    }
));


passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, function (email, password, done) {
    console.log(email, password)
    User.findOne({ email: email })
        .then((user) => {
            if (!user) { return done(null, false, { message: ' email is not register' }); }
            user.verifyPassword(password, (err, result) => {
                if (err) return done(err)
                //no password
                if (!result) {
                    return done(null, false, { message: 'password is wrong' })
                }
                //success
                return done(null, user)
            })
        })
        .catch((err) => {
            done(err)
        })
}
));

passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser((id, done) => {
    User.findById(id, 'name email username')
        .then((user) => {
            done(null, user)
        })
})