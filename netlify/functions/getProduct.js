const { Octokit } = require("@octokit/rest");
const matter = require("gray-matter");

const OWNER = "Marcodacruz1300";
const REPO = "stonr";
const BRANCH = "main";
const PRODUCTS_DIR = "content/produits";

exports.handler = async (event) => {
  try {
    const slug = event.queryStringParameters.slug;
    const path = `${PRODUCTS_DIR}/${slug}.md`;

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const { data: file } = await octokit.repos.getContent({
      owner: OWNER, repo: REPO, path, ref: BRANCH
    });

    const content = Buffer.from(file.content, "base64").toString("utf8");
    const parsed = matter(content);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, product: { slug, ...parsed.data } })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: { name: err.name, message: err.message } })
    };
  }
};
