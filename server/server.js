import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();

const mongoUri = process.env.MONGODB_URI;
const secret =
  process.env.AUTH_SECRET || "development-secret-change-this";


app.use(
  cors({
    origin: "*",
    credentials: true
  })
);

app.use(express.json({ limit: "5mb" }));


// =======================
// DATABASE MODELS
// =======================

const userSchema = new mongoose.Schema(
{
  email:{
    type:String,
    unique:true,
    lowercase:true
  },

  password:String,

  role:{
    type:String,
    default:"student"
  },

  teamId:String,

  teamName:String,

  memberName:String

},
{
 timestamps:true
}
);



const teamSchema = new mongoose.Schema(
{

teamId:{
 type:String,
 unique:true
},

teamName:String,

college:String,

members:Array,

status:{
 type:String,
 default:"Registered"
}

},
{
 timestamps:true
}

);



const announcementSchema =
new mongoose.Schema(
{

text:String,

attachment:
mongoose.Schema.Types.Mixed,

author:String,

date:{
type:Date,
default:Date.now
}

}

);



const User =
mongoose.models.User ||
mongoose.model("User",userSchema);


const Team =
mongoose.models.Team ||
mongoose.model("Team",teamSchema);


const Announcement =
mongoose.models.Announcement ||
mongoose.model(
"Announcement",
announcementSchema
);




// =======================
// DATABASE CONNECTION
// =======================


let isConnected=false;


async function connectDB(){

if(isConnected)
return;


if(!mongoUri){

console.log(
"MONGODB_URI missing"
);

return;

}


try{

await mongoose.connect(mongoUri);


isConnected=true;


console.log(
"MongoDB Connected"
);


// create admin users

const admins=[
"sandeeptrangarajan@gmail.com",
"yogabalan2007yoga@gmail.com"
];


for(const email of admins){


let user=
await User.findOne({email});


if(!user){


await User.create({

email,

password:
bcrypt.hashSync(
"Admin@ksrce",
10
),

role:"admin"

});


}


}



}
catch(error){

console.log(
"MongoDB Error:",
error.message
);

}


}





// =======================
// HELPERS
// =======================


function publicUser(user){

return {

id:user._id,

email:user.email,

role:user.role,

teamId:user.teamId,

teamName:user.teamName,

memberName:user.memberName

};

}




function createToken(user){


const payload =
Buffer.from(
JSON.stringify({

id:user._id,

exp:
Date.now()+7*24*60*60*1000

})

)
.toString("base64url");



const signature =
crypto
.createHmac(
"sha256",
secret
)
.update(payload)
.digest("base64url");



return `${payload}.${signature}`;


}





async function auth(req,res,next){


try{


const token =
req.headers.authorization
?.replace(
"Bearer ",
""
);



if(!token)
throw Error();



const [
payload,
signature
]=token.split(".");


const valid =
crypto
.createHmac(
"sha256",
secret
)
.update(payload)
.digest("base64url");


if(valid!==signature)
throw Error();



const data =
JSON.parse(
Buffer.from(
payload,
"base64url"
)
.toString()
);



req.user =
await User.findById(data.id);



if(!req.user)
throw Error();



next();



}
catch{

res.status(401).json({

message:
"Unauthorized"

});

}


}




function admin(req,res,next){

if(req.user?.role==="admin")
return next();


return res.status(403).json({

message:
"Admin access required"

});

}





// =======================
// ROUTES
// =======================



app.get(
"/api/health",
async(req,res)=>{


await connectDB();


res.json({

status:
"Server is running",

mongodb:
mongoose.connection.readyState===1
?
"Connected"
:
"Disconnected"

});


}

);





// REGISTER


app.post(
"/api/auth/register",
async(req,res)=>{


try{


await connectDB();



const {
teamName,
college,
password,
members

}=req.body;



if(
!teamName ||
!college ||
!password ||
!Array.isArray(members) ||
members.length!==3
)

return res.status(400).json({

message:
"Invalid registration data"

});




const formatted =
members.map(
(m,i)=>({

name:m.name,

email:
m.email
.toLowerCase()
.trim(),

isTeamHead:
i===0

})
);



const exists =
await User.findOne({

email:
formatted[0].email

});



if(exists)

return res.status(409).json({

message:
"Email already registered"

});





const team =
await Team.create({

teamId:
"TEAM-"+Date.now(),

teamName,

college,

members:
formatted

});




const users =
await User.insertMany(

formatted.map(
m=>({

email:m.email,

password:
bcrypt.hashSync(
password,
10
),

teamId:
team.teamId,

teamName,

memberName:
m.name

})
)

);




res.json({

token:
createToken(users[0]),

user:
publicUser(users[0])

});



}
catch(error){

console.log(error);


res.status(500).json({

message:
error.message

});


}



}

);





// LOGIN


app.post(
"/api/auth/login",
async(req,res)=>{


await connectDB();


const email =
req.body.email
?.toLowerCase()
.trim();



const user =
await User.findOne({
email
});



if(
!user ||
!(await bcrypt.compare(
req.body.password,
user.password
))
)

return res.status(401).json({

message:
"Invalid credentials"

});



res.json({

token:
createToken(user),

user:
publicUser(user)

});



}

);





// ANNOUNCEMENTS


app.get(
"/api/announcements",
auth,
async(req,res)=>{


await connectDB();


res.json(

await Announcement.find()
.sort({
date:-1
})

);


}

);




app.post(
"/api/announcements",
auth,
admin,
async(req,res)=>{


await connectDB();


const data =
await Announcement.create({

text:req.body.text,

attachment:
req.body.attachment,

author:req.user.email

});


res.json(data);


}

);





app.delete(
"/api/announcements/:id",
auth,
admin,
async(req,res)=>{


await Announcement.findByIdAndDelete(
req.params.id
);


res.json({

message:"Deleted"

});


}

);






// TEAMS


app.get(
"/api/teams",
auth,
admin,
async(req,res)=>{


await connectDB();


res.json(

await Team.find()
.sort({
createdAt:-1
})

);


}

);





app.delete(
"/api/teams/:teamId",
auth,
admin,
async(req,res)=>{


await Team.findOneAndDelete({

teamId:req.params.teamId

});


await User.deleteMany({

teamId:req.params.teamId

});


res.json({

message:"Deleted"

});


}

);





// =======================
// VERCEL EXPORT
// =======================


export default async function handler(req,res){

await connectDB();

return app(req,res);

}