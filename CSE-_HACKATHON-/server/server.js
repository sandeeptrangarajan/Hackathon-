// =========================================================
// IMPORTS
// =========================================================

import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();

// =========================================================
// ENVIRONMENT
// =========================================================

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  'change-this-development-secret';

const VERCEL_ORIGIN =
  'https://hackathon-21yy.vercel.app';

const LOCAL_ORIGIN =
  'http://localhost:5173';

// =========================================================
// CORS
// =========================================================

const allowedOrigins = [
  LOCAL_ORIGIN,
  VERCEL_ORIGIN
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error('Not allowed by CORS')
      );
    },
    credentials: true
  })
);

app.use(
  express.json({
    limit: '5mb'
  })
);

// =========================================================
// DATABASE SCHEMAS
// =========================================================

// User Schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    default: 'student'
  },

  teamId: String,
  teamName: String,
  memberName: String
});

// Team Schema
const teamSchema = new mongoose.Schema(
  {
    teamId: {
      type: String,
      unique: true
    },

    teamName: String,
    college: String,
    members: Array,

    status: {
      type: String,
      default: 'Registered'
    }
  },
  {
    timestamps: true
  }
);

// Announcement Schema
const announcementSchema = new mongoose.Schema({
  text: String,

  attachment:
    mongoose.Schema.Types.Mixed,

  author: String,

  status: {
    type: String,
    enum: [
      'active',
      'postponed'
    ],
    default: 'active'
  },

  date: {
    type: Date,
    default: Date.now
  }
});

// =========================================================
// MODELS
// =========================================================

const User =
  mongoose.models.User ||
  mongoose.model(
    'User',
    userSchema
  );

const Team =
  mongoose.models.Team ||
  mongoose.model(
    'Team',
    teamSchema
  );

const Announcement =
  mongoose.models.Announcement ||
  mongoose.model(
    'Announcement',
    announcementSchema
  );

// =========================================================
// MONGODB CONNECTION
// =========================================================

let mongoConnectionPromise = null;

const connectMongoDB = async () => {
  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not configured.'
    );
  }

  if (
    mongoose.connection.readyState === 1
  ) {
    return mongoose.connection;
  }

  if (
    mongoose.connection.readyState === 2 &&
    mongoConnectionPromise
  ) {
    await mongoConnectionPromise;

    return mongoose.connection;
  }

  mongoConnectionPromise =
    mongoose.connect(
      MONGODB_URI
    );

  try {
    await mongoConnectionPromise;

    console.log(
      'MongoDB connected successfully'
    );

    return mongoose.connection;
  } catch (error) {
    mongoConnectionPromise = null;

    console.error(
      'MongoDB connection failed:',
      error.message
    );

    throw error;
  }
};

// =========================================================
// HELPER FUNCTIONS
// =========================================================

const publicUser = (user) => ({
  id: user._id.toString(),
  email: user.email,
  role: user.role,
  teamId: user.teamId,
  teamName: user.teamName,
  memberName: user.memberName
});

const makeToken = (user) => {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user._id.toString(),

      exp:
        Date.now() +
        7 * 24 * 60 * 60 * 1000
    })
  ).toString('base64url');

  const signature =
    crypto
      .createHmac(
        'sha256',
        AUTH_SECRET
      )
      .update(payload)
      .digest('base64url');

  return `${payload}.${signature}`;
};

const isBcryptHash = (value) =>
  typeof value === 'string' &&
  /^\$2[aby]\$/i.test(value);

const verifyPassword = async (
  candidate,
  stored
) => {
  if (!stored) {
    return false;
  }

  if (isBcryptHash(stored)) {
    return bcrypt.compare(
      candidate,
      stored
    );
  }

  return candidate === stored;
};

// =========================================================
// AUTHENTICATION MIDDLEWARE
// =========================================================

const auth = async (
  req,
  res,
  next
) => {
  try {
    const token =
      req.headers.authorization?.replace(
        /^Bearer\s+/i,
        ''
      ) || '';

    const [
      payload,
      signature
    ] = token.split('.');

    if (
      !payload ||
      !signature
    ) {
      throw new Error(
        'Invalid token'
      );
    }

    const expectedSignature =
      crypto
        .createHmac(
          'sha256',
          AUTH_SECRET
        )
        .update(payload)
        .digest('base64url');

    if (
      signature !==
      expectedSignature
    ) {
      throw new Error(
        'Invalid signature'
      );
    }

    const data =
      JSON.parse(
        Buffer.from(
          payload,
          'base64url'
        ).toString()
      );

    if (
      !data.exp ||
      data.exp < Date.now()
    ) {
      throw new Error(
        'Token expired'
      );
    }

    await connectMongoDB();

    const user =
      await User.findById(
        data.sub
      );

    if (!user) {
      throw new Error(
        'User not found'
      );
    }

    req.user = user;

    next();
  } catch (error) {
    console.error(
      'Authentication error:',
      error.message
    );

    return res.status(401).json({
      message:
        'Invalid or expired authentication token.'
    });
  }
};

// =========================================================
// ADMIN MIDDLEWARE
// =========================================================

const admin = (
  req,
  res,
  next
) => {
  if (
    req.user?.role === 'admin'
  ) {
    return next();
  }

  return res.status(403).json({
    message:
      'Administrator access required.'
  });
};

// =========================================================
// API ROUTES
// =========================================================

// Health
app.get(
  '/api/health',
  async (req, res) => {
    try {
      await connectMongoDB();

      return res.json({
        status:
          'Server is running',

        mongodb:
          mongoose.connection
            .readyState === 1
            ? 'Connected'
            : 'Disconnected',

        environment:
          process.env.NODE_ENV ||
          'development'
      });
    } catch (error) {
      return res.status(500).json({
        status:
          'Server is running',

        mongodb:
          'Disconnected',

        message:
          error.message
      });
    }
  }
);

// =========================================================
// AUTH ROUTES
// =========================================================

// Register
app.post(
  '/api/auth/register',
  async (
    req,
    res,
    next
  ) => {
    // Your complete register code
  }
);

// Login
app.post(
  '/api/auth/login',
  async (
    req,
    res,
    next
  ) => {
    // Your complete login code
  }
);

// =========================================================
// ANNOUNCEMENT ROUTES
// =========================================================

// GET
app.get(
  '/api/announcements',
  auth,
  async (
    req,
    res,
    next
  ) => {
    // Your GET code
  }
);

// CREATE
app.post(
  '/api/announcements',
  auth,
  admin,
  async (
    req,
    res,
    next
  ) => {
    // Your POST code
  }
);

// UPDATE
app.put(
  '/api/announcements/:id',
  auth,
  admin,
  async (
    req,
    res,
    next
  ) => {
    // Your PUT code
  }
);

// DELETE
app.delete(
  '/api/announcements/:id',
  auth,
  admin,
  async (
    req,
    res,
    next
  ) => {
    // Your DELETE code
  }
);

// =========================================================
// TEAM ROUTES
// =========================================================

// GET TEAMS
app.get(
  '/api/teams',
  auth,
  admin,
  async (
    req,
    res,
    next
  ) => {
    // Your GET teams code
  }
);

// DELETE TEAM
app.delete(
  '/api/teams/:teamId',
  auth,
  admin,
  async (
    req,
    res,
    next
  ) => {
    // Your DELETE team code
  }
);

// =========================================================
// 404
// =========================================================

app.use(
  (req, res) => {
    return res.status(404).json({
      message:
        'API route not found.'
    });
  }
);

// =========================================================
// ERROR HANDLER
// =========================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      'Server error:',
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        'Internal server error.'
    });
  }
);

// =========================================================
// LOCAL SERVER
// =========================================================

if (
  process.env.NODE_ENV !==
  'production'
) {
  connectMongoDB()
    .then(async () => {

      // Admin setup
      // Your existing admin creation code

      app.listen(
        PORT,
        () => {
          console.log(
            `MongoDB API running on port ${PORT}`
          );
        }
      );
    })
    .catch((error) => {
      console.error(
        'MongoDB connection failed:',
        error.message
      );
    });
}

// =========================================================
// VERCEL
// =========================================================

export default app;