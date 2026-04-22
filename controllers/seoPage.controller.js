const SeoPage = require("../models/SeoPageModel");

const createSEOAllpage = async (req, res) => {
  try {
    const {
      pageTitle,
      seoTitle,
      metaDescription,
      metaKeywords,
      slug,
      canonicalUrl,
      ogImage,
      robots,
      structuredData,
      pageContent,
      pageType,
      author,
      isActive,
      views,
      keywordRank,
    } = req.body;

    if (!seoTitle || !metaDescription || !slug) {
      return res.status(400).json({
        message: "seoTitle, metaDescription and slug are required",
      });
    }

    const exists = await SeoPage.findOne({ slug });
    if (exists) {
      return res
        .status(409)
        .json({ message: "SEO content for this slug already exists" });
    }

    // Handle metaKeywords if sent as a JSON string
    let parsedKeywords = metaKeywords;
    if (typeof metaKeywords === 'string') {
      try {
        parsedKeywords = JSON.parse(metaKeywords);
      } catch (e) {
        parsedKeywords = metaKeywords.split(',').map(k => k.trim());
      }
    }

    const newPage = new SeoPage({
      pageTitle: pageTitle || "",
      seoTitle,
      metaDescription,
      metaKeywords: parsedKeywords || [],
      slug,
      canonicalUrl: canonicalUrl || "",
      ogImage: ogImage || "",
      robots: robots || "index, follow",
      structuredData: structuredData || "",
      pageContent: pageContent || "",
      pageType: pageType || "page",
      author: author || "",
      isActive: isActive ?? true,
      views: views ?? 0,
      keywordRank: keywordRank ?? 0,
    });

    const savedPage = await newPage.save();

    return res.status(201).json({
      message: "SEO page created successfully",
      data: savedPage,
    });
  } catch (error) {
    console.error("Create SEO Page Error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const getSeoBySlug = async (req, res) => {
  try {
    let slug = req.query.slug || req.params.slug || req.params[0];

    // Default homepage
    if (!slug) slug = "/";

    // Normalize: remove extra spaces and ensure we handle variations of "/"
    let cleanSlug = slug.trim();

    // Create variations for the search (with/without leading and trailing slashes)
    const normalized = cleanSlug.replace(/^\/+|\/+$/g, "");
    const withLeading = `/${normalized}`;
    const withTrailing = `${normalized}/`;
    const withBoth = `/${normalized}/`;

    console.log("Requested slug search:", cleanSlug);

    const page = await SeoPage.findOne({
      $or: [
        { slug: cleanSlug },
        { slug: normalized },
        { slug: withLeading },
        { slug: withTrailing },
        { slug: withBoth }
      ],
      isActive: true,
    });

    if (!page) {
      console.warn("SEO content not found for:", cleanSlug);
      return res.status(404).json({
        message: "SEO content not found",
      });
    }

    res.json(page);

  } catch (error) {
    console.error("SEO fetch error:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// ⭐ Admin — Get All SEO Pages
const getAllSeoPages = async (req, res) => {
  try {
    const pages = await SeoPage.find().sort({ createdAt: -1 });
    return res.json({ total: pages.length, data: pages });
  } catch (error) {
    console.error("Get All SEO Pages Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ⭐ Delete SEO Page by ID
const DeleteSeoPages = async (req, res) => {
  try {
    const { id } = req.params;

    const page = await SeoPage.findById(id);
    if (!page) return res.status(404).json({ message: "SEO page not found" });

    await SeoPage.findByIdAndDelete(id);
    return res.json({ message: "SEO page deleted successfully" });
  } catch (error) {
    console.error("Delete SEO Page Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ⭐ Edit / Update SEO Page by ID
const EditSeoPages = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      pageTitle,
      seoTitle,
      metaDescription,
      metaKeywords,
      slug,
      canonicalUrl,
      ogImage,
      robots,
      structuredData,
      pageContent,
      pageType,
      author,
      isActive,
      views,
      keywordRank
    } = req.body;

    const page = await SeoPage.findById(id);
    if (!page) return res.status(404).json({ message: "SEO page not found" });

    // Handle metaKeywords parsing
    let parsedKeywords = metaKeywords;
    if (typeof metaKeywords === 'string') {
      try {
        parsedKeywords = JSON.parse(metaKeywords);
      } catch (e) {
        parsedKeywords = metaKeywords.split(',').map(k => k.trim());
      }
    }

    page.pageTitle = pageTitle !== undefined ? pageTitle : page.pageTitle;
    page.seoTitle = seoTitle || page.seoTitle;
    page.metaDescription = metaDescription || page.metaDescription;
    if (parsedKeywords) page.metaKeywords = parsedKeywords;
    page.slug = slug || page.slug;
    page.canonicalUrl = canonicalUrl !== undefined ? canonicalUrl : page.canonicalUrl;
    page.ogImage = ogImage !== undefined ? ogImage : page.ogImage;
    page.robots = robots !== undefined ? robots : page.robots;
    page.structuredData = structuredData !== undefined ? structuredData : page.structuredData;
    page.pageContent = pageContent !== undefined ? pageContent : page.pageContent;
    page.pageType = pageType || page.pageType;
    page.author = author !== undefined ? author : page.author;
    page.isActive = isActive !== undefined ? isActive : page.isActive;
    page.views = views !== undefined ? views : page.views;
    page.keywordRank = keywordRank !== undefined ? keywordRank : page.keywordRank;

    const updatedPage = await page.save();
    return res.json({ message: "SEO page updated successfully", data: updatedPage });
  } catch (error) {
    console.error("Edit SEO Page Error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


const getSeoById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "❌ Invalid SEO page ID" });
    }

    const page = await SeoPage.findById(id);

    if (!page) {
      return res.status(404).json({ message: "SEO page not found" });
    }

    return res.json(page);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


module.exports = {
  createSEOAllpage,
  getSeoBySlug,
  getAllSeoPages,
  DeleteSeoPages,
  EditSeoPages,
  getSeoById
};
