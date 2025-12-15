const { Octokit } = require("@octokit/rest");
const multiparty = require("multiparty");
const fs = require("fs");

exports.handler = async (event) => {
  try {
    const form = new multiparty.Form();
    const data = await new Promise((resolve, reject) => {
      form.parse(event.req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const title = fields.title[0];
    const price = fields.price[0];
    const description = fields.description[0];
    const imageFile = files.image[0];

    // Lire le fichier image
    const imageContent = fs.readFileSync(imageFile.path);

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Upload image
    const imagePath = `assets/uploads/${imageFile.originalFilename}`;
    await octokit.repos.createOrUpdateFileContents({
      owner: "TON_COMPTE",
      repo: "TON_REPO",
      path: imagePath,
      message: `Upload image ${imageFile.originalFilename}`,
      content: imageContent.toString("base64"),
      branch: "main"
    });

    // Créer le fichier produit
    const mdContent = `---
title: "${title}"
price: ${price}
description: "${description}"
image: "/${imagePath}"
published: true
---
`;

    const productPath = `content/produits/${title.replace(/\s+/g, "-").toLowerCase()}.md`;
    await octokit.repos.createOrUpdateFileContents({
      owner: "TON_COMPTE",
      repo: "TON_REPO",
      path: productPath,
      message: `Ajout produit ${title}`,
      content: Buffer.from(mdContent).toString("base64"),
      branch: "main"
    });

    return { statusCode: 200, body: "Produit ajouté avec succès !" };
  } catch (err) {
    return { statusCode: 500, body: "Erreur: " + err.message };
  }
};
