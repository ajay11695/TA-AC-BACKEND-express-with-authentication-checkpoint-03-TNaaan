var User = require('../model/User')

module.exports = {
    loggedInUser: (req, res, next) => {
        if ((req.session && req.session.userId) || (req.session && req.session.passport )) {
            next()
        } else {
            res.redirect('/users/login')
        }
    },

    userInfo: (req, res, next) => {
        var userId = (req.session && req.session.userId)
        var userId2 = (req.session && req.session.passport)
        if (userId) {
            User.findById(userId)
            .then((user)=>{
                req.user = user
                res.locals.user = user
               return next()
            })
            .catch((err)=>{
                return next(err)
            })
        }else if(userId2){
            User.findById(userId2.user)
                .then((user)=>{
                    req.user = user
                    res.locals.user = user
                   return next()
                })
                .catch((err)=>{
                    return next(err)
                })
        }else{
            req.user = null
                res.locals.user = null
                next()
        }
    }
}