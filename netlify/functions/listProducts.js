const { Octokit } = require("@octokit/rest");

const OWNER = "Marcodacruz1300";
const REPO = "stonr";
const BRANCH = "main";
const PRODUCTS_DIR = "content/produits";

exports.handler = async () => {
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const { data } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: PRODUCTS_DIR,
      ref: BRANCH
    });

    const products = data
      .filter(f => f.type === "file" && f.name.endsWith(".md"))
      .map(f => {
        const slug = f.name.replace(".md", "");
        return { slug, title: slug, price: "?", description: "", image: "" };
      });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, products })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: { name: err.name, message: err.message } })
    };
  }
};
