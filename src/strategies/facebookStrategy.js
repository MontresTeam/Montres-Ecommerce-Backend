require('dotenv').config(); // <--- MUST be at the top, before using process.env
const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;
const jwt = require("jsonwebtoken");


passport.use(
  new FacebookStrategy(
    {
      clientID:process.env.FB_APP_ID,
      clientSecret:process.env.FB_APP_SECRET,
      callbackURL:process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ["id", "name", "emails", "picture.type(large)"],
    },
    (accessToken, refreshToken, profile, done) => {
      // Fallback for name
      const name =
        profile.displayName ||
        (profile.name
          ? `${profile.name.givenName || ""} ${profile.name.familyName || ""}`.trim()
          : "Facebook User");

      const email =
        profile.emails?.[0]?.value || `${profile.id}@facebook.com`;

      const picture =
        profile.photos?.[0]?.value || null;

      const token = jwt.sign(
        { id: profile.id, name, email, picture },
        process.env.USER_ACCESS_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      const frontendUser = { id: profile.id, name, email, picture, provider: "facebook" };

      done(null, { token, profile: frontendUser });
    }
  )
);


// passport.use(
//   new FacebookStrategy(
//     {
//       clientID: process.env.FB_APP_ID,
//       clientSecret: process.env.FB_APP_SECRET,
//       callbackURL: "http://localhost:9000/api/Auth/facebook/callback",
//       profileFields: ["id", "displayName", "photos", "email"],
//     },
//     (accessToken, refreshToken, profile, done) => {
//       const token = jwt.sign(
//         { id: profile.id, name: profile.displayName, email: profile.emails[0]?.value, photo: profile.photos[0]?.value },
//         process.env.JWT_SECRET,
//         { expiresIn: "1d" }
//       );
//       return done(null, { token, profile });
//     }
//   )
// );

