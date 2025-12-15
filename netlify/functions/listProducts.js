const { Octokit } = require("@octokit/rest");
const matter = require("gray-matter");

const OWNER = "Marcodacruz1300";   // ton compte GitHub
const REPO = "stonr";              // ton repo
const BRANCH = "main";             // ta branche
const PRODUCTS_DIR = "content/produits";

exports.handler = async () => {
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Récupérer la liste des fichiers dans le dossier produits
    const { data } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: PRODUCTS_DIR,
      ref: BRANCH
    });

    // Filtrer uniquement les fichiers .md
    const products = [];
    for (const file of data) {
      if (file.type === "file" && file.name.endsWith(".md")) {
        const slug = file.name.replace(".md", "");

        // Charger le contenu du fichier
        const { data: fileData } = await octokit.repos.getContent({
          owner: OWNER,
          repo: REPO,
          path: file.path,
          ref: BRANCH
        });

        const content = Buffer.from(fileData.content, "base64").toString("utf8");
        const parsed = matter(content);

        products.push({
          slug,
          ...parsed.data
        });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, products })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: { name: err.name || "Error", message: err.message } })
    };
  }
};
