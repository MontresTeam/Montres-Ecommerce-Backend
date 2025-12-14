
require('dotenv').config();
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const passport = require("passport");
const User = require("../models/UserModel");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || profile._json?.email;
        if (!email) return done(new Error("Email is required from Google account"));

        const picture = profile.photos?.[0]?.value || profile._json?.picture;
        const name = profile.displayName;
        const googleId = profile.id;

        let user = await User.findOne({ $or: [{ googleId }, { email }] });
        if (!user) {
          user = await User.create({
            name,
            email,
            googleId,
            avatar: picture,
            provider: "google",
          });
        } else if (!user.googleId) {
          user.googleId = googleId;
          user.avatar = user.avatar || picture;
          user.provider = "google";
          await user.save();
        }

        const token = jwt.sign(
          { id: user._id.toString(), email: user.email, name: user.name, provider: "google" },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        const frontendProfile = {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          picture,
          provider: "google",
        };

        return done(null, { token, profile: frontendProfile });
      } catch (err) {
        return done(err);
      }
    }
  )
);

// require('dotenv').config(); // <--- MUST be at the top, before using process.env
// const passport = require("passport");
// const GoogleStrategy = require("passport-google-oauth20").Strategy;
// const jwt = require("jsonwebtoken");

// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: "http://localhost:9000/api/Auth/google/callback"
//     },
//     (accessToken, refreshToken, profile, done) => {
//       // Create JWT token with user info
//       const token = jwt.sign(
//         { id: profile.id, name: profile.displayName, email: profile.emails[0].value, photo: profile.photos[0].value },
//         process.env.JWT_SECRET,
//         { expiresIn: "1d" }
//       );
//       return done(null, { token, profile });
//     }
//   )
// );

