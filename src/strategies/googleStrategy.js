
require('dotenv').config();
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const passport = require("passport");

passport.use(
  new GoogleStrategy(
    {
      clientID:process.env.GOOGLE_CLIENT_ID,
      clientSecret:process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:process.env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    },
    (accessToken, refreshToken, profile, done) => {
      // Normalize profile
      const normalizedProfile = {
        id: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value || profile._json?.email,
        picture: profile.photos?.[0]?.value || profile._json?.picture,
        provider: "google",
      };

      if (!normalizedProfile.email) {
        return done(new Error("Email is required from Google account"));
      }

      // Optionally generate a token here
      const token = jwt.sign(
        {
          userId: normalizedProfile.id,
          email: normalizedProfile.email,
          name: normalizedProfile.name,
          provider: normalizedProfile.provider,
        },
        process.env.USER_ACCESS_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      // Pass both token and normalized profile to the next step
      return done(null, { token, profile: normalizedProfile });
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

