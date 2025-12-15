const { Octokit } = require("@octokit/rest");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Ton token GitHub (mettre en variable d'environnement sur Netlify)
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    const content = `---
title: "${body.title}"
price: ${body.price}
description: "${body.description}"
image: "${body.image}"
published: true
---

`;

    const path = `content/produits/${body.title.replace(/\s+/g, "-").toLowerCase()}.md`;

    await octokit.repos.createOrUpdateFileContents({
      owner: "TON_COMPTE",
      repo: "TON_REPO",
      path,
      message: `Ajout produit ${body.title}`,
      content: Buffer.from(content).toString("base64"),
      branch: "main"
    });

    return {
      statusCode: 200,
      body: "Produit ajouté avec succès !"
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: "Erreur: " + err.message
    };
  }
};
