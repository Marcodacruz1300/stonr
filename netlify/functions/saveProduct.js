const { Octokit } = require("@octokit/rest");

const OWNER = "Marcodacruz1300";
const REPO = "stonr";
const BRANCH = "main";
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
    requireAdmin(event.headers);
    const body = JSON.parse(event.body || "{}");
    const { title, price, description, imageBase64, imageName, originalSlug, image } = body;

    if (!title || !price || !description) {
      const e = new Error("Missing required fields: title, price, description");
      e.name = "ValidationError";
      throw e;
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Upload image if provided
    let imagePath = image || "";
    if (imageBase64 && imageName) {
      imagePath = `${IMAGES_DIR}/${imageName}`;
      await octokit.repos.createOrUpdateFileContents({
        owner: OWNER,
        repo: REPO,
        path: imagePath,
        message: `Upload image ${imageName}`,
        content: imageBase64, // doit être base64 pur (sans header data:)
        branch: BRANCH
      });
      imagePath = `/${imagePath}`;
    }

    // Slug simple et stable
    const slug = title.replace(/\s+/g, "-").toLowerCase();
    const mdPath = `${PRODUCTS_DIR}/${slug}.md`;

    // Si renommage: supprimer l'ancien fichier si présent
    if (originalSlug && originalSlug !== slug) {
      const oldPath = `${PRODUCTS_DIR}/${originalSlug}.md`;
      try {
        const { data: oldFile } = await octokit.repos.getContent({
          owner: OWNER, repo: REPO, path: oldPath, ref: BRANCH
        });
        if (oldFile && oldFile.sha) {
          await octokit.repos.deleteFile({
            owner: OWNER, repo: REPO, path: oldPath,
            message: `Rename product ${originalSlug} -> ${slug}`,
            sha: oldFile.sha, branch: BRANCH
          });
        }
      } catch (err) {
        if (err.status !== 404) throw err;
      }
    }

    const frontmatter = toFrontMatter({ title, price, description, image: imagePath });
    const contentBase64 = Buffer.from(frontmatter).toString("base64");

    // Upsert en deux temps:
    // 1) tenter création sans SHA
    // 2) si échec parce que le fichier existe, récupérer SHA et mettre à jour
    try {
      await octokit.repos.createOrUpdateFileContents({
        owner: OWNER,
        repo: REPO,
        path: mdPath,
        message: `Add product ${title}`,
        content: contentBase64,
        branch: BRANCH
      });
    } catch (err) {
      // 422 et message "sha wasn't supplied" quand le fichier existe déjà
      const isShaMissing =
        err.status === 422 &&
        typeof err.message === "string" &&
        err.message.toLowerCase().includes("sha") &&
        err.message.toLowerCase().includes("wasn't supplied");

      if (!isShaMissing && err.status !== 409) throw err;

      // Récupérer SHA puis update
      const { data: existing } = await octokit.repos.getContent({
        owner: OWNER, repo: REPO, path: mdPath, ref: BRANCH
      });
      const sha = existing.sha;

      await octokit.repos.createOrUpdateFileContents({
        owner: OWNER,
        repo: REPO,
        path: mdPath,
        message: `Update product ${title}`,
        content: contentBase64,
        branch: BRANCH,
        sha
      });
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        message: `Produit publié: ${title}`,
        slug
      })
    };
  } catch (err) {
    return {
      statusCode: err.name === "AuthError" ? 401 : (err.name === "ValidationError" ? 400 : 500),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: { name: err.name || "Error", message: err.message }
      })
    };
  }
};
