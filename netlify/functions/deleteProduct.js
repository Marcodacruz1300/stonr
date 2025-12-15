const { Octokit } = require("@octokit/rest");

const OWNER = "Marcodacruz1300";
const REPO = "stonr";
const BRANCH = "main";
const PRODUCTS_DIR = "content/produits";

exports.handler = async (event) => {
  try {
    const { slug } = JSON.parse(event.body || "{}");
    if (!slug) {
      const e = new Error("Missing slug");
      e.name = "ValidationError";
      throw e;
    }

    const path = `${PRODUCTS_DIR}/${slug}.md`;
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const { data: file } = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path, ref: BRANCH });

    await octokit.repos.deleteFile({
      owner: OWNER, repo: REPO, path,
      message: `Delete product ${slug}`, sha: file.sha, branch: BRANCH
    });

    return { statusCode: 200, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, message: `Produit supprimé: ${slug}` }) };
  } catch (err) {
    return { statusCode: err.name === "ValidationError" ? 400 : 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: { name: err.name || "Error", message: err.message } }) };
  }
};
