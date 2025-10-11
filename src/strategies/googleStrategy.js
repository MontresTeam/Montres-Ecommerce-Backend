require('dotenv').config(); // <--- MUST be at the top, before using process.env
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:9000/api/Auth/google/callback"
    },
    (accessToken, refreshToken, profile, done) => {
      // Create JWT token with user info
      const token = jwt.sign(
        { id: profile.id, name: profile.displayName, email: profile.emails[0].value, photo: profile.photos[0].value },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );
      return done(null, { token, profile });
    }
  )
);
