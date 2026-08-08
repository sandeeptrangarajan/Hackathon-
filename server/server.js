import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();

/* =========================================================
   CONFIGURATION
========================================================= */

const mongoUri = process.env.MONGODB_URI;

const secret =
  process.env.AUTH_SECRET ||
  "change-this-development-secret";

const clientOrigin =
  process.env.CLIENT_ORIGIN || "*";

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "5mb",
  })
);

/* =========================================================
   MONGODB CONNECTION
   Works with Vercel Serverless Functions
========================================================= */

let mongoConnectionPromise = null;

async function connectDB() {
  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI environment variable is missing."
    );
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoConnectionPromise) {
    return mongoConnectionPromise;
  }

  mongoConnectionPromise = mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    })
    .then(() => {
      console.log("MongoDB connected successfully");
      return mongoose.connection;
    })
    .catch((error) => {
      mongoConnectionPromise = null;

      console.error(
        "MongoDB connection failed:",
        error.message
      );

      throw error;
    });

  return mongoConnectionPromise;
}

/* =========================================================
   SCHEMAS
========================================================= */

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      required: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      default: "student",
    },

    teamId: {
      type: String,
      default: null,
    },

    teamName: {
      type: String,
      default: null,
    },

    memberName: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const teamSchema = new mongoose.Schema(
  {
    teamId: {
      type: String,
      unique: true,
      required: true,
    },

    teamName: {
      type: String,
      required: true,
    },

    college: {
      type: String,
      required: true,
    },

    members: {
      type: Array,
      default: [],
    },

    status: {
      type: String,
      default: "Registered",
    },
  },
  {
    timestamps: true,
  }
);

const announcementSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      default: "",
    },

    attachment: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    author: {
      type: String,
      default: "",
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================================================
   MODELS
   Prevent OverwriteModelError on Vercel
========================================================= */

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

/* =========================================================
   HELPERS
========================================================= */

function publicUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    teamId: user.teamId,
    teamName: user.teamName,
    memberName: user.memberName,
  };
}

/* =========================================================
   TOKEN GENERATION
========================================================= */

function makeToken(user) {
  const payload = {
    sub: user._id.toString(),

    exp:
      Date.now() +
      7 * 24 * 60 * 60 * 1000,
  };

  const encoded = Buffer.from(
    JSON.stringify(payload)
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${signature}`;
}

/* =========================================================
   PASSWORD HELPERS
========================================================= */

function isBcryptHash(value) {
  return (
    typeof value === "string" &&
    /^\$2[aby]\$/i.test(value)
  );
}

async function verifyPassword(
  candidate,
  stored
) {
  if (!stored) {
    return false;
  }

  if (isBcryptHash(stored)) {
    return bcrypt.compare(
      candidate,
      stored
    );
  }

  /*
    Supports old plain-text passwords
    that may already exist in MongoDB.
  */

  return candidate === stored;
}

/* =========================================================
   ADMIN INITIALIZATION
========================================================= */

let adminInitializationPromise = null;

async function initializeAdmins() {
  if (adminInitializationPromise) {
    return adminInitializationPromise;
  }

  adminInitializationPromise =
    (async () => {
      await connectDB();

      const adminEmails = [
        "sandeeptrangarajan@gmail.com",
        "yogabalan2007yoga@gmail.com",
      ];

      const adminPassword =
        "Admin@ksrce";

      for (const email of adminEmails) {
        let user =
          await User.findOne({
            email,
          });

        /*
          Create admin if it doesn't exist.
        */

        if (!user) {
          user = await User.create({
            email,
            password:
              await bcrypt.hash(
                adminPassword,
                10
              ),
            role: "admin",
          });

          console.log(
            `Created admin account: ${email}`
          );

          continue;
        }

        let changed = false;

        /*
          Make sure the account is admin.
        */

        if (user.role !== "admin") {
          user.role = "admin";
          changed = true;
        }

        /*
          Convert old plain-text password
          to bcrypt.
        */

        if (
          !isBcryptHash(
            user.password
          )
        ) {
          user.password =
            await bcrypt.hash(
              adminPassword,
              10
            );

          changed = true;
        }

        if (changed) {
          await user.save();

          console.log(
            `Updated admin account: ${email}`
          );
        }
      }
    })().catch((error) => {
      adminInitializationPromise =
        null;

      console.error(
        "Admin initialization failed:",
        error.message
      );

      throw error;
    });

  return adminInitializationPromise;
}

/* =========================================================
   AUTHENTICATION MIDDLEWARE
========================================================= */

async function auth(
  req,
  res,
  next
) {
  try {
    await connectDB();

    const authorization =
      req.headers.authorization ||
      "";

    const token =
      authorization.replace(
        /^Bearer\s+/i,
        ""
      );

    if (!token) {
      throw new Error(
        "Missing authentication token"
      );
    }

    const parts =
      token.split(".");

    if (parts.length !== 2) {
      throw new Error(
        "Invalid token format"
      );
    }

    const [
      payload,
      signature,
    ] = parts;

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          secret
        )
        .update(payload)
        .digest("base64url");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(
          expectedSignature
        )
      )
    ) {
      throw new Error(
        "Invalid token signature"
      );
    }

    const data =
      JSON.parse(
        Buffer.from(
          payload,
          "base64url"
        ).toString()
      );

    if (
      !data.exp ||
      data.exp < Date.now()
    ) {
      throw new Error(
        "Token expired"
      );
    }

    if (!data.sub) {
      throw new Error(
        "Invalid token subject"
      );
    }

    const user =
      await User.findById(
        data.sub
      );

    if (!user) {
      throw new Error(
        "User not found"
      );
    }

    req.user = user;

    return next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error.message
    );

    return res.status(401).json({
      message:
        "Invalid or expired authentication token.",
    });
  }
}

/* =========================================================
   ADMIN MIDDLEWARE
========================================================= */

function admin(
  req,
  res,
  next
) {
  if (
    req.user &&
    req.user.role === "admin"
  ) {
    return next();
  }

  return res.status(403).json({
    message:
      "Administrator access required.",
  });
}

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  "/api/health",
  async (req, res) => {
    try {
      await connectDB();

      return res.status(200).json({
        status:
          "Server is running",

        mongodb:
          mongoose.connection
            .readyState === 1
            ? "Connected"
            : "Disconnected",
      });
    } catch (error) {
      console.error(
        "Health check error:",
        error.message
      );

      return res.status(503).json({
        status:
          "Server is running",

        mongodb:
          "Disconnected",

        error:
          "MongoDB connection failed",
      });
    }
  }
);

/* =========================================================
   API ROOT
========================================================= */

app.get(
  "/api",
  (req, res) => {
    return res.json({
      message:
        "CSE Hackathon API",

      status:
        "running",
    });
  }
);

/* =========================================================
   REGISTER
========================================================= */

app.post(
  "/api/auth/register",
  async (req, res, next) => {
    try {
      await connectDB();

      const {
        teamName,
        college,
        password,
        members,
      } = req.body;

      if (
        !teamName ||
        !college ||
        !password ||
        !Array.isArray(
          members
        ) ||
        members.length !== 3
      ) {
        return res.status(400).json({
          message:
            "Complete registration details are required.",
        });
      }

      const normalizedMembers =
        members.map(
          (
            member,
            index
          ) => ({
            ...member,

            name:
              member.name
                ?.trim(),

            email:
              member.email
                ?.trim()
                .toLowerCase(),

            isTeamHead:
              index === 0,
          })
        );

      const emails =
        normalizedMembers.map(
          (member) =>
            member.email
        );

      if (
        emails.some(
          (email) => !email
        )
      ) {
        return res.status(400).json({
          message:
            "All member emails are required.",
        });
      }

      if (
        new Set(emails)
          .size !== 3
      ) {
        return res.status(400).json({
          message:
            "Each team member must have a unique email.",
        });
      }

      const existingUser =
        await User.findOne({
          email: {
            $in: emails,
          },
        });

      if (existingUser) {
        return res.status(409).json({
          message:
            "One or more member emails are already registered.",
        });
      }

      const teamId =
        `TEAM-${Date.now()
          .toString(36)
          .toUpperCase()}`;

      const team =
        await Team.create({
          teamId,
          teamName,
          college,
          members:
            normalizedMembers,
          status:
            "Registered",
        });

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const users =
        await User.insertMany(
          normalizedMembers.map(
            (member) => ({
              email:
                member.email,

              password:
                hashedPassword,

              role:
                "student",

              teamId:
                team.teamId,

              teamName,

              memberName:
                member.name,
            })
          )
        );

      const teamHead =
        users.find(
          (user) =>
            user.email ===
            normalizedMembers[0]
              .email
        ) ||
        users[0];

      return res
        .status(201)
        .json({
          token:
            makeToken(
              teamHead
            ),

          user:
            publicUser(
              teamHead
            ),
        });
    } catch (error) {
      return next(error);
    }
  }
);

/* =========================================================
   LOGIN
========================================================= */

app.post(
  "/api/auth/login",
  async (req, res, next) => {
    try {
      await connectDB();

      const email =
        req.body.email
          ?.trim()
          .toLowerCase();

      const password =
        req.body.password ||
        "";

      if (
        !email ||
        !password
      ) {
        return res.status(400).json({
          message:
            "Email and password are required.",
        });
      }

      const user =
        await User.findOne({
          email,
        });

      if (!user) {
        return res.status(401).json({
          message:
            "Invalid email or password.",
        });
      }

      const valid =
        await verifyPassword(
          password,
          user.password
        );

      if (!valid) {
        return res.status(401).json({
          message:
            "Invalid email or password.",
        });
      }

      /*
        If this is one of the default
        admin accounts, make sure its
        role is admin.
      */

      const defaultAdmins = [
        "sandeeptrangarajan@gmail.com",
        "yogabalan2007yoga@gmail.com",
      ];

      if (
        defaultAdmins.includes(
          user.email
        ) &&
        user.role !== "admin"
      ) {
        user.role = "admin";
        await user.save();
      }

      return res.json({
        token:
          makeToken(user),

        user:
          publicUser(user),
      });
    } catch (error) {
      return next(error);
    }
  }
);

/* =========================================================
   GET ANNOUNCEMENTS
========================================================= */

app.get(
  "/api/announcements",
  auth,
  async (req, res, next) => {
    try {
      const announcements =
        await Announcement.find()
          .sort({
            date: -1,
          });

      return res.json(
        announcements
      );
    } catch (error) {
      return next(error);
    }
  }
);

/* =========================================================
   CREATE ANNOUNCEMENT
========================================================= */

app.post(
  "/api/announcements",
  auth,
  admin,
  async (req, res, next) => {
    try {
      const announcement =
        await Announcement.create(
          {
            text:
              req.body.text ||
              "",

            attachment:
              req.body
                .attachment ||
              null,

            author:
              req.user.email,
          }
        );

      return res
        .status(201)
        .json(
          announcement
        );
    } catch (error) {
      return next(error);
    }
  }
);

/* =========================================================
   UPDATE ANNOUNCEMENT
========================================================= */

app.put(
  "/api/announcements/:id",
  auth,
  admin,
  async (req, res, next) => {
    try {
      const announcement =
        await Announcement.findByIdAndUpdate(
          req.params.id,

          {
            text:
              req.body.text,

            attachment:
              req.body
                .attachment,
          },

          {
            new: true,
          }
        );

      if (!announcement) {
        return res.status(404).json({
          message:
            "Announcement not found.",
        });
      }

      return res.json(
        announcement
      );
    } catch (error) {
      return next(error);
    }
  }
);

/* =========================================================
   DELETE ANNOUNCEMENT
========================================================= */

app.delete(
  "/api/announcements/:id",
  auth,
  admin,
  async (req, res, next) => {
    try {
      const deleted =
        await Announcement.findByIdAndDelete(
          req.params.id
        );

      if (!deleted) {
        return res.status(404).json({
          message:
            "Announcement not found.",
        });
      }

      return res.json({
        message:
          "Deleted",
      });
    } catch (error) {
      return next(error);
    }
  }
);

/* =========================================================
   GET TEAMS
========================================================= */

app.get(
  "/api/teams",
  auth,
  admin,
  async (req, res, next) => {
    try {
      const teams =
        await Team.find()
          .sort({
            createdAt: -1,
          });

      return res.json(
        teams
      );
    } catch (error) {
      return next(error);
    }
  }
);

/* =========================================================
   DELETE TEAM
========================================================= */

app.delete(
  "/api/teams/:teamId",
  auth,
  admin,
  async (req, res, next) => {
    try {
      const teamId =
        req.params.teamId;

      await Team.findOneAndDelete({
        teamId,
      });

      await User.deleteMany({
        teamId,
      });

      return res.json({
        message:
          "Deleted",
      });
    } catch (error) {
      return next(error);
    }
  }
);

/* =========================================================
   404 API HANDLER
========================================================= */

app.use(
  "/api",
  (req, res) => {
    return res.status(404).json({
      message:
        "API endpoint not found.",
    });
  }
);

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "API Error:",
      error
    );

    if (
      res.headersSent
    ) {
      return next(
        error
      );
    }

    return res.status(500).json({
      message:
        process.env.NODE_ENV ===
        "production"
          ? "Internal server error."
          : error.message,
    });
  }
);

/* =========================================================
   LOCAL DEVELOPMENT
========================================================= */

if (!process.env.VERCEL) {
  const port =
    process.env.PORT ||
    5000;

  initializeAdmins()
    .then(() => {
      app.listen(
        port,
        () => {
          console.log(
            "MongoDB connected for local development"
          );

          console.log(
            `Local server running at http://localhost:${port}`
          );
        }
      );
    })
    .catch(
      (error) => {
        console.error(
          "Local startup failed:",
          error.message
        );
      }
    );
}

/* =========================================================
   VERCEL HANDLER
========================================================= */

async function handler(
  req,
  res
) {
  try {
    /*
      Connect MongoDB and initialize
      admin accounts before processing
      the request.
    */

    await initializeAdmins();

    return app(
      req,
      res
    );
  } catch (error) {
    console.error(
      "Vercel backend initialization error:",
      error
    );

    return res.status(500).json({
      message:
        "Backend initialization failed.",

      error:
        process.env.NODE_ENV ===
        "production"
          ? "Database initialization failed."
          : error.message,
    });
  }
}

export default handler;