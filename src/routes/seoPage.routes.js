const express = require('express');
const { createSEOAllpage, getSeoBySlug, getAllSeoPages, EditSeoPages, DeleteSeoPages } = require('../controllers/seoPage.controller');
const router = express.Router();


router.post('/Add',createSEOAllpage)
router.get('/slug',getSeoBySlug)
router.get("/Allpages",getAllSeoPages)
// Admin — Update page by ID
router.put("/:id", EditSeoPages);

// Admin — Delete page by ID
router.delete("/:id", DeleteSeoPages);

module.exports = router;