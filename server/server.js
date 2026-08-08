import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();

/* =========================================================
   CONFIG
========================================================= */

const mongoUri = process.env.MONGODB_URI;
const secret =
  process.env.AUTH_SECRET || "change-this-development-secret";

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

app.use(express.json({ limit: "5mb" }));

/* =========================================================
   MONGODB CONNECTION
   Vercel Serverless compatible connection cache
========================================================= */

let mongoConnectionPromise = null;

async function connectDB() {
  if (!mongoUri) {
    throw new Error("MONGODB_URI environment variable is missing.");
  }

  // Already connected
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Connection currently in progress
  if (mongoConnectionPromise) {
    return mongoConnectionPromise;
  }

  mongoConnectionPromise = mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    })
    .then((connection) => {
      console.log("MongoDB connected successfully");
      return connection;
    })
    .catch((error) => {
      mongoConnectionPromise = null;
      console.error("MongoDB connection failed:", error.message);
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

    teamId: String,
    teamName: String,
    memberName: String,
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

    teamName: String,

    college: String,

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
    text: String,

    attachment: mongoose.Schema.Types.Mixed,

    author: String,

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
   Prevent OverwriteModelError in Vercel
========================================================= */

const User =
  mongoose.models.User ||
  mongoose.model("User", userSchema);

const Team =
  mongoose.models.Team ||
  mongoose.model("Team", teamSchema);

const Announcement =
  mongoose.models.Announcement ||
  mongoose.model("Announcement", announcementSchema);

/* =========================================================
   HELPERS
========================================================= */

const publicUser = (user) => ({
  id: user._id.toString(),
  email: user.email,
  role: user.role,
  teamId: user.teamId,
  teamName: user.teamName,
  memberName: user.memberName,
});

function makeToken(user) {
  const payload = {
    sub: user._id.toString(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
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

function isBcryptHash(value) {
  return (
    typeof value === "string" &&
    /^\$2[aby]\$/i.test(value)
  );
}

async function verifyPassword(candidate, stored) {
  if (!stored) {
    return false;
  }

  if (isBcryptHash(stored)) {
    return bcrypt.compare(candidate, stored);
  }

  // Supports old plain-text passwords already present in DB
  return candidate === stored;
}

/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

const auth = async (req, res, next) => {
  try {
    await connectDB();

    const authorization =
      req.headers.authorization || "";

    const token = authorization.replace(
      /^Bearer\s+/i,
      ""
    );

    const parts = token.split(".");

    if (parts.length !== 2) {
      throw new Error("Invalid token");
    }

    const [payload, signature] = parts;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    if (signature !== expectedSignature) {
      throw new Error("Invalid signature");
    }

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString()
    );

    if (!data.exp || data.exp < Date.now()) {
      throw new Error("Token expired");
    }

    const user = await User.findById(data.sub);

    if (!user) {
      throw new Error("User not found");
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      message: "Invalid or expired authentication token.",
    });
  }
};

/* =========================================================
   ADMIN MIDDLEWARE
========================================================= */

const admin = (req, res, next) => {
  if (req.user?.role === "admin") {
    return next();
  }

  return res.status(403).json({
    message: "Administrator access required.",
  });
};

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", async (req, res) => {
  try {
    await connectDB();

    return res.status(200).json({
      status: "Server is running",
      mongodb:
        mongoose.connection.readyState === 1
          ? "Connected"
          : "Disconnected",
    });
  } catch (error) {
    console.error("Health check MongoDB error:", error.message);

    return res.status(503).json({
      status: "Server is running",
      mongodb: "Disconnected",
      error: "MongoDB connection failed",
    });
  }
});

/* =========================================================
   ROOT
========================================================= */

app.get("/api", (req, res) => {
  res.json({
    message: "CSE Hackathon API",
    status: "running",
  });
});

/* =========================================================
   REGISTER TEAM
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
        !Array.isArray(members) ||
        members.length !== 3
      ) {
        return res.status(400).json({
          message:
            "Complete registration details are required.",
        });
      }

      const normalizedMembers = members.map(
        (member, index) => ({
          ...member,
          name: member.name?.trim(),
          email: member.email
            ?.trim()
            .toLowerCase(),
          isTeamHead: index === 0,
        })
      );

      const emails = normalizedMembers.map(
        (member) => member.email
      );

      if (
        emails.some((email) => !email) ||
        new Set(emails).size !== 3
      ) {
        return res.status(400).json({
          message:
            "Each team member must have a unique email.",
        });
      }

      const existingUser = await User.findOne({
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

      const teamId = `TEAM-${Date.now()
        .toString(36)
        .toUpperCase()}`;

      const team = await Team.create({
        teamId,
        teamName,
        college,
        members: normalizedMembers,
        status: "Registered",
      });

      const hashedPassword = await bcrypt.hash(
        password,
        10
      );

      const users = await User.insertMany(
        normalizedMembers.map((member) => ({
          email: member.email,
          password: hashedPassword,
          role: "student",
          teamId: team.teamId,
          teamName,
          memberName: member.name,
        }))
      );

      const teamHead =
        users.find(
          (user) =>
            user.email === normalizedMembers[0].email
        ) || users[0];

      return res.status(201).json({
        token: makeToken(teamHead),
        user: publicUser(teamHead),
      });
    } catch (error) {
      next(error);
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

      const email = req.body.email
        ?.trim()
        .toLowerCase();

      const password = req.body.password || "";

      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password are required.",
        });
      }

      const user = await User.findOne({
        email,
      });

      if (
        !user ||
        !(await verifyPassword(
          password,
          user.password
        ))
      ) {
        return res.status(401).json({
          message: "Invalid email or password.",
        });
      }

      return res.json({
        token: makeToken(user),
        user: publicUser(user),
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   ANNOUNCEMENTS
========================================================= */

app.get(
  "/api/announcements",
  auth,
  async (req, res, next) => {
    try {
      const announcements =
        await Announcement.find()
          .sort({ date: -1 });

      return res.json(announcements);
    } catch (error) {
      next(error);
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
        await Announcement.create({
          text: req.body.text,
          attachment:
            req.body.attachment || null,
          author: req.user.email,
        });

      return res.status(201).json(
        announcement
      );
    } catch (error) {
      next(error);
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
            text: req.body.text,
            attachment:
              req.body.attachment,
          },
          {
            new: true,
          }
        );

      if (!announcement) {
        return res.status(404).json({
          message: "Announcement not found.",
        });
      }

      return res.json(announcement);
    } catch (error) {
      next(error);
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
          message: "Announcement not found.",
        });
      }

      return res.json({
        message: "Deleted",
      });
    } catch (error) {
      next(error);
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
      const teams = await Team.find()
        .sort({ createdAt: -1 });

      return res.json(teams);
    } catch (error) {
      next(error);
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
      const teamId = req.params.teamId;

      await Team.findOneAndDelete({
        teamId,
      });

      await User.deleteMany({
        teamId,
      });

      return res.json({
        message: "Deleted",
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use((error, req, res, next) => {
  console.error(
    "API Error:",
    error
  );

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error."
        : error.message,
  });
});

/* =========================================================
   LOCAL DEVELOPMENT ONLY
   IMPORTANT:
   Vercel uses the exported app and does NOT execute listen().
========================================================= */

if (!process.env.VERCEL) {
  const port = process.env.PORT || 5000;

  connectDB()
    .then(async () => {
      console.log(
        "MongoDB connected for local development"
      );

      // Create default admin accounts
      const adminEmails = [
        "sandeeptrangarajan@gmail.com",
        "yogabalan2007yoga@gmail.com",
      ];

      for (const email of adminEmails) {
        const existing =
          await User.findOne({ email });

        if (!existing) {
          await User.create({
            email,
            password:
              await bcrypt.hash(
                "Admin@ksrce",
                10
              ),
            role: "admin",
          });

          console.log(
            `Created admin: ${email}`
          );
        } else if (
          existing.password &&
          !isBcryptHash(existing.password)
        ) {
          existing.password =
            await bcrypt.hash(
              "Admin@ksrce",
              10
            );

          await existing.save();

          console.log(
            `Updated password for: ${email}`
          );
        }
      }

      app.listen(port, () => {
        console.log(
          `Local server running at http://localhost:${port}`
        );
      });
    })
    .catch((error) => {
      console.error(
        "Local MongoDB connection failed:",
        error.message
      );
    });
}

/* =========================================================
   VERCEL EXPORT
========================================================= */

export default app;