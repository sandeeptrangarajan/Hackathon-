import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();

const secret =
  process.env.AUTH_SECRET || "change-this-development-secret";

const mongoUri = process.env.MONGODB_URI;


// Middleware
app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json({ limit: "5mb" }));


// ================= DATABASE MODELS =================

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
  },
  password: String,
  role: {
    type: String,
    default: "student",
  },
  teamId: String,
  teamName: String,
  memberName: String,
});


const teamSchema = new mongoose.Schema(
  {
    teamId: {
      type: String,
      unique: true,
    },
    teamName: String,
    college: String,
    members: Array,
    status: {
      type: String,
      default: "Registered",
    },
  },
  {
    timestamps: true,
  }
);


const announcementSchema = new mongoose.Schema({
  text: String,
  attachment: mongoose.Schema.Types.Mixed,
  author: String,
  date: {
    type: Date,
    default: Date.now,
  },
});


const User =
  mongoose.models.User ||
  mongoose.model("User", userSchema);


const Team =
  mongoose.models.Team ||
  mongoose.model("Team", teamSchema);


const Announcement =
  mongoose.models.Announcement ||
  mongoose.model(
    "Announcement",
    announcementSchema
  );



// ================= HELPERS =================


const publicUser = (u) => ({
  id: u._id.toString(),
  email: u.email,
  role: u.role,
  teamId: u.teamId,
  teamName: u.teamName,
  memberName: u.memberName,
});


const makeToken = (u) => {

  const payload = Buffer.from(
    JSON.stringify({
      sub: u._id.toString(),
      exp: Date.now() + 604800000,
    })
  ).toString("base64url");


  const signature =
    crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");


  return `${payload}.${signature}`;
};



const isBcryptHash = (value) =>
  typeof value === "string" &&
  /^\$2[aby]\$/i.test(value);



const verifyPassword = async (
  candidate,
  stored
) => {

  if (!stored) return false;


  if (isBcryptHash(stored)) {
    return bcrypt.compare(
      candidate,
      stored
    );
  }


  return candidate === stored;
};



// ================= AUTH =================


const auth = async (
  req,
  res,
  next
) => {

  try {

    const token =
      req.headers.authorization
        ?.replace(/^Bearer\s+/i, "");


    const [payload, signature] =
      (token || "").split(".");


    const expected =
      crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("base64url");


    if (
      !payload ||
      signature !== expected
    ) {
      throw new Error();
    }


    const data =
      JSON.parse(
        Buffer.from(
          payload,
          "base64url"
        ).toString()
      );


    if (data.exp < Date.now()) {
      throw new Error();
    }


    req.user =
      await User.findById(data.sub);


    if (!req.user) {
      throw new Error();
    }


    next();


  } catch {

    res.status(401).json({
      message:
        "Invalid or expired authentication token",
    });

  }

};



const admin = (
  req,
  res,
  next
) => {

  if (
    req.user &&
    req.user.role === "admin"
  ) {
    next();
  }
  else {

    res.status(403).json({
      message:
        "Administrator access required",
    });

  }

};



// ================= ROUTES =================



app.get(
  "/api/health",
  (req,res)=>{

    res.json({

      status:
        "Server is running",

      mongodb:
        mongoose.connection.readyState === 1
          ? "Connected"
          : "Disconnected",

    });

  }
);



// REGISTER

app.post(
"/api/auth/register",
async(req,res)=>{

try{


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
){

return res.status(400).json({

message:
"Complete registration details required"

});

}



const normalized =
members.map(
(m,i)=>({

...m,

email:
m.email.trim().toLowerCase(),

isTeamHead:
i===0

})
);



const exists =
await User.findOne({
email:
normalized[0].email
});


if(exists){

return res.status(409).json({

message:
"Member already registered"

});

}



const team =
await Team.create({

teamId:
`TEAM-${Date.now()
.toString(36)
.toUpperCase()}`,

teamName,

college,

members:
normalized

});



const users =
await User.insertMany(

normalized.map(m=>({

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

}))

);



res.status(201).json({

token:
makeToken(users[0]),

user:
publicUser(users[0])

});



}catch(err){

res.status(500).json({

message:
err.message

});

}

});



// LOGIN

app.post(
"/api/auth/login",
async(req,res)=>{


try{


const user =
await User.findOne({

email:
req.body.email
.trim()
.toLowerCase()

});



if(
!user ||
!(await verifyPassword(
req.body.password,
user.password
))
){

return res.status(401).json({

message:
"Invalid email or password"

});

}



res.json({

token:
makeToken(user),

user:
publicUser(user)

});


}catch(err){

res.status(500).json({

message:
err.message

});

}


});




// ANNOUNCEMENTS


app.get(
"/api/announcements",
auth,
async(req,res)=>{

res.json(
await Announcement
.find()
.sort({
date:-1
})
);

});



app.post(
"/api/announcements",
auth,
admin,
async(req,res)=>{


const data =
await Announcement.create({

...req.body,

author:
req.user.email

});


res.status(201).json(data);


});




// TEAMS

app.get(
"/api/teams",
auth,
admin,
async(req,res)=>{

res.json(
await Team.find()
.sort({
createdAt:-1
})
);

});



// DELETE TEAM

app.delete(
"/api/teams/:teamId",
auth,
admin,
async(req,res)=>{


await Team.findOneAndDelete({

teamId:
req.params.teamId

});


await User.deleteMany({

teamId:
req.params.teamId

});


res.json({

message:
"Deleted"

});


});




// ================= MONGODB =================


let connection;


async function connectDB(){

if(!mongoUri){

console.warn(
"MONGODB_URI missing"
);

return;

}


if(connection)
return connection;



connection =
await mongoose.connect(
mongoUri
);


console.log(
"MongoDB connected"
);



return connection;

}



connectDB()
.catch(err=>{

console.log(
"MongoDB error",
err.message
);

});




// IMPORTANT FOR VERCEL

export default app;