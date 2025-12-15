const { Octokit } = require("@octokit/rest");

const OWNER = "Marcodacruz1300";
const REPO = "stonr";
const PRODUCTS_DIR = "content/produits";

const requireAdmin = (headers) => {
  const code = headers["x-admin-code"];
  if (!code || code !== process.env.ADMIN_CODE) {
    const err = new Error("Invalid admin code");
    err.name = "AuthError";
    throw err;
  }
};

exports.handler = async (event) => {
  try {
    requireAdmin(event.headers);
    const { slug } = JSON.parse(event.body || "{}");
    if (!slug) {
      const e = new Error("Missing 'slug'");
      e.name = "ValidationError";
      throw e;
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const path = `${PRODUCTS_DIR}/${slug}.md`;

    const { data: file } = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path });
    await octokit.repos.deleteFile({
      owner: OWNER,
      repo: REPO,
      path,
      message: `Delete product ${slug}`,
      sha: file.sha,
      branch: "main"
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, message: `Produit supprimé: ${slug}` })
    };
  } catch (err) {
    return {
      statusCode: err.name === "AuthError" ? 401 : (err.name === "ValidationError" ? 400 : (err.status === 404 ? 404 : 500)),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: { name: err.name || "Error", message: err.message } })
    };
  }
};
