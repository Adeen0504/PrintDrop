const passport      = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { v4: uuidv4 } = require('uuid');
const db            = require('../db/database');

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  '/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if this Google account has signed in before
      let user = await db.users.findOne({ googleId: profile.id });

      if (!user) {
        // First time — create account with a unique ID
        user = {
          googleId:  profile.id,
          uniqueId:  uuidv4(),               // permanent ID for this account
          name:      profile.displayName,
          email:     profile.emails[0].value,
          avatar:    profile.photos[0]?.value || null,
          isOwner:   profile.emails[0].value === process.env.OWNER_EMAIL,
          createdAt: new Date().toISOString()
        };
        await db.users.insert(user);
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// Store only googleId in the session cookie
passport.serializeUser((user, done) => {
  done(null, user.googleId);
});

// Load full user from DB on each request
passport.deserializeUser(async (googleId, done) => {
  try {
    const user = await db.users.findOne({ googleId });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
