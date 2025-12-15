const { Octokit } = require("@octokit/rest");

const OWNER = "Marcodacruz1300";   // ton compte GitHub
const REPO = "stonr";              // ton repo
const BRANCH = "main";             // ta branche
const PRODUCTS_DIR = "content/produits";

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { slug } = body;

    if (!slug) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: { name: "ValidationError", message: "slug requis" } })
      };
    }

    const filePath = `${PRODUCTS_DIR}/${slug}.md`;
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Récupérer le sha du fichier à supprimer
    const { data: file } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      ref: BRANCH
    });

    const sha = file.sha;

    // Supprimer le fichier
    await octokit.repos.deleteFile({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      message: `Delete product ${slug}`,
      branch: BRANCH,
      sha
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message: "Produit supprimé", slug })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: { name: err.name || "Error", message: err.message } })
    };
  }
};
