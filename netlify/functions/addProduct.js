const { Octokit } = require("@octokit/rest");
const formidable = require("formidable");
const fs = require("fs");

exports.handler = async (event) => {
  try {
    // Parse le formulaire
    const form = formidable({ multiples: false });
    const data = await new Promise((resolve, reject) => {
      form.parse(event.req || event, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const title = data.fields.title[0];
    const price = data.fields.price[0];
    const description = data.fields.description[0];
    const imageFile = data.files.image[0];

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Upload image
    const imageContent = fs.readFileSync(imageFile.filepath);
    const imagePath = `assets/uploads/${imageFile.originalFilename}`;
    await octokit.repos.createOrUpdateFileContents({
      owner: "Marcodacruz1300",
      repo: "stonr",
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
      owner: "Marcodacruz1300",
      repo: "stonr",
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
