// Google ID token verification (no-op error when GOOGLE_CLIENT_ID is missing).
const { OAuth2Client } = require("google-auth-library");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
let _client = null;

function getClient() {
  if (!GOOGLE_CLIENT_ID) return null;
  if (!_client) _client = new OAuth2Client(GOOGLE_CLIENT_ID);
  return _client;
}

async function verifyGoogleIdToken(idToken) {
  const client = getClient();
  if (!client) {
    const err = new Error("Google auth not configured");
    err.status = 500;
    throw err;
  }
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

module.exports = { verifyGoogleIdToken, GOOGLE_CLIENT_ID };
