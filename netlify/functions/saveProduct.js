const { Octokit } = require("@octokit/rest");

const OWNER = "Marcodacruz1300";
const REPO = "stonr";
const BRANCH = "main";
const PRODUCTS_DIR = "content/produits";
const IMAGES_DIR = "assets/uploads";

const toFrontMatter = ({ title, price, description, image }) => {
  return `---
title: "${title}"
price: ${Number(price)}
description: "${description}"
image: "${image}"
published: true
---
`;
};

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { title, price, description, imageBase64, imageName, originalSlug, image } = body;

    if (!title || !price || !description) {
      const e = new Error("Missing required fields: title, price, description");
      e.name = "ValidationError";
      throw e;
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    let imagePath = image || "";
    if (imageBase64 && imageName) {
      imagePath = `${IMAGES_DIR}/${imageName}`;
      await octokit.repos.createOrUpdateFileContents({
        owner: OWNER, repo: REPO, path: imagePath,
        message: `Upload image ${imageName}`, content: imageBase64, branch: BRANCH
      });
      imagePath = `/${imagePath}`;
    }

    const slug = title.replace(/\s+/g, "-").toLowerCase();
    const mdPath = `${PRODUCTS_DIR}/${slug}.md`;

    if (originalSlug && originalSlug !== slug) {
      const oldPath = `${PRODUCTS_DIR}/${originalSlug}.md`;
      try {
        const { data: oldFile } = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path: oldPath, ref: BRANCH });
        await octokit.repos.deleteFile({
          owner: OWNER, repo: REPO, path: oldPath,
          message: `Rename product ${originalSlug} -> ${slug}`,
          sha: oldFile.sha, branch: BRANCH
        });
      } catch (err) { if (err.status !== 404) throw err; }
    }

    const frontmatter = toFrontMatter({ title, price, description, image: imagePath });
    const contentBase64 = Buffer.from(frontmatter).toString("base64");

    try {
      await octokit.repos.createOrUpdateFileContents({
        owner: OWNER, repo: REPO, path: mdPath,
        message: `Add product ${title}`, content: contentBase64, branch: BRANCH
      });
    } catch (err) {
      const { data: existing } = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path: mdPath, ref: BRANCH });
      await octokit.repos.createOrUpdateFileContents({
        owner: OWNER, repo: REPO, path: mdPath,
        message: `Update product ${title}`, content: contentBase64, branch: BRANCH, sha: existing.sha
      });
    }

    return { statusCode: 200, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, message: `Produit publié: ${title}`, slug }) };
  } catch (err) {
    return { statusCode: err.name === "ValidationError" ? 400 : 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: { name: err.name || "Error", message: err.message } }) };
  }
};
