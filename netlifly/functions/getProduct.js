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

const parseFrontMatter = (text) => {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  const yaml = match[1];
  const obj = {};
  yaml.split("\n").forEach((line) => {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) return;
    const key = kv[1];
    let val = kv[2];
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (key === "price") obj[key] = Number(val);
    else if (key === "published") obj[key] = val === "true";
    else obj[key] = val;
  });
  return obj;
};

exports.handler = async (event) => {
  try {
    requireAdmin(event.headers);
    const { slug } = event.queryStringParameters || {};
    if (!slug) {
      const e = new Error("Missing 'slug' parameter");
      e.name = "ValidationError";
      throw e;
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const path = `${PRODUCTS_DIR}/${slug}.md`;
    const file = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path });
    const content = Buffer.from(file.data.content, "base64").toString("utf8");
    const fm = parseFrontMatter(content);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, product: { slug, ...fm } })
    };
  } catch (err) {
    return {
      statusCode: err.name === "AuthError" ? 401 : (err.name === "ValidationError" ? 400 : (err.status === 404 ? 404 : 500)),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: { name: err.name || "Error", message: err.message } })
    };
  }
};
