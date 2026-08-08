import app, { connectDatabase } from "../server/server.js";

let databaseReady;

export default async function handler(req, res) {
  try {
    databaseReady ??= connectDatabase();

    await databaseReady;

    return app(req, res);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Backend connection failed",
      error: error.message
    });
  }
}