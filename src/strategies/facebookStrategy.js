require('dotenv').config(); // <--- MUST be at the top, before using process.env
const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;
const jwt = require("jsonwebtoken");

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FB_APP_ID,
      clientSecret: process.env.FB_APP_SECRET,
      callbackURL: "http://localhost:9000/api/Auth/facebook/callback",
      profileFields: ["id", "displayName", "photos", "email"],
    },
    (accessToken, refreshToken, profile, done) => {
      const token = jwt.sign(
        { id: profile.id, name: profile.displayName, email: profile.emails[0]?.value, photo: profile.photos[0]?.value },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );
      return done(null, { token, profile });
    }
  )
);
