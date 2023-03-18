var mongoose=require('mongoose')
var bcrypt=require('bcrypt')
const { resource } = require('../app')
var Schema=mongoose.Schema


var userSchema=new Schema({
    name:{type:String,required:true},
    email:{type:String,required:true,unique:true},
    password:{type:String,minlength:5},
    age:Number,
    phone:Number,
    country:String,
    emailToken: String,
    isVerified:{type:Boolean,default:false},
    providers:[String],
    github:{
        name:String,
        username:String,
        image:String
    },
    google:{
        name:String,
        image:String
    },
    incomeID: [{ type: Schema.Types.ObjectId, ref: 'Income' }],
    expenseID: [{ type: Schema.Types.ObjectId, ref: 'Expense' }]
},{
    timestamps:true
})

userSchema.pre('save',function(next){
    // this is refer mongoose database and show before from add database
    console.log(this)
    if(this.password && this.isModified('password')){
        bcrypt.hash(this.password,10,(err,hashed)=>{
            if(err)return next(err)
            this.password=hashed
            return next()
        })
    }else{
        return next()
    }
})

// method

userSchema.methods.verifyPassword=function(password,cb){
    bcrypt.compare(password, this.password ,(err,result)=>{
        return cb(err,result)
    })
}

module.exports=mongoose.model('User',userSchema)