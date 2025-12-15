const { Octokit } = require("@octokit/rest");
const matter = require("gray-matter");

const OWNER = "Marcodacruz1300";   // ton compte GitHub
const REPO = "stonr";              // ton repo
const BRANCH = "main";             // ta branche
const PRODUCTS_DIR = "content/produits";

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { title, price, description, imageBase64, imageName, originalSlug, image } = body;

    if (!title || !price || !description) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: { name: "ValidationError", message: "title, price et description requis" } })
      };
    }

    // slug = nom du fichier
    const slug = originalSlug || title.toLowerCase().replace(/\s+/g, "-");
    const filePath = `${PRODUCTS_DIR}/${slug}.md`;

    // contenu du fichier Markdown avec frontmatter
    const content = matter.stringify(description, {
      title,
      price,
      description,
      image: image || "",
      published: true
    });

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Vérifier si le fichier existe déjà pour récupérer son sha
    let sha = null;
    try {
      const { data: file } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: filePath,
        ref: BRANCH
      });
      sha = file.sha;
    } catch (err) {
      // si 404, c’est un nouveau fichier → pas de sha
      if (err.status !== 404) throw err;
    }

    // Créer ou mettre à jour le fichier
    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      message: sha ? `Update product ${slug}` : `Create product ${slug}`,
      content: Buffer.from(content).toString("base64"),
      branch: BRANCH,
      sha: sha || undefined
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message: sha ? "Produit mis à jour" : "Produit créé", slug })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: { name: err.name || "Error", message: err.message } })
    };
  }
};
