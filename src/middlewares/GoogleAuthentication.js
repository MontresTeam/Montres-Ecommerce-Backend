const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const router = express.Router();

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:9000/api/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // Save user info in DB here
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Routes
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Redirect frontend with token/session
    res.redirect("http://localhost:3000/");
  }
);

module.exports = router;
