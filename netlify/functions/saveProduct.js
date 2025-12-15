const { Octokit } = require("@octokit/rest");

const OWNER = "Marcodacruz1300";
const REPO = "stonr";
const PRODUCTS_DIR = "content/produits";
const IMAGES_DIR = "assets/uploads";

const requireAdmin = (headers) => {
  const code = headers["x-admin-code"];
  if (!code || code !== process.env.ADMIN_CODE) {
    const err = new Error("Invalid admin code");
    err.name = "AuthError";
    throw err;
  }
};

const toFrontMatter = ({ title, price, description, image, published }) => {
  return `---
title: "${title}"
price: ${Number(price)}
description: "${description}"
image: "${image}"
published: ${published ? "true" : "false"}
---
`;
};

exports.handler = async (event) => {
  try {
    requireAdmin(event.headers);
    const body = JSON.parse(event.body || "{}");
    const { title, price, description, published, imageBase64, imageName, originalSlug } = body;

    if (!title || !price || !description) {
      const e = new Error("Missing required fields: title, price, description");
      e.name = "ValidationError";
      throw e;
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Upload image if provided
    let imagePath = body.image || "";
    if (imageBase64 && imageName) {
      imagePath = `${IMAGES_DIR}/${imageName}`;
      await octokit.repos.createOrUpdateFileContents({
        owner: OWNER,
        repo: REPO,
        path: imagePath,
        message: `Upload image ${imageName}`,
        content: imageBase64,
        branch: "main"
      });
      imagePath = `/${imagePath}`;
    }

    const slug = title.replace(/\s+/g, "-").toLowerCase();
    const mdPath = `${PRODUCTS_DIR}/${slug}.md`;

    // If renaming
    if (originalSlug && originalSlug !== slug) {
      const oldPath = `${PRODUCTS_DIR}/${originalSlug}.md`;
      try {
        const { data: oldFile } = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path: oldPath });
        await octokit.repos.deleteFile({
          owner: OWNER,
          repo: REPO,
          path: oldPath,
          message: `Rename product ${originalSlug} -> ${slug}`,
          sha: oldFile.sha,
          branch: "main"
        });
      } catch (err) {
        if (err.status !== 404) throw err;
      }
    }

    const frontmatter = toFrontMatter({
      title,
      price,
      description,
      image: imagePath,
      published: !!published
    });

    const contentBase64 = Buffer.from(frontmatter).toString("base64");

    // Get SHA if file exists
    let sha;
    try {
      const { data: existing } = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path: mdPath });
      sha = existing.sha;
    } catch (err) {
      if (err.status !== 404) throw err; // ignore si le fichier n'existe pas
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: mdPath,
      message: sha ? `Update product ${title}` : `Add product ${title}`,
      content: contentBase64,
      branch: "main",
      ...(sha ? { sha } : {})
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        message: published ? `Article publié: ${title}` : `Brouillon enregistré: ${title}`,
        slug
      })
    };
  } catch (err) {
    return {
      statusCode: err.name === "AuthError" ? 401 : (err.name === "ValidationError" ? 400 : 500),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: { name: err.name || "Error", message: err.message } })
    };
  }
};
