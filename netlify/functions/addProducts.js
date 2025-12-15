exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const content = `---
title: "${body.title}"
price: ${body.price}
description: "${body.description}"
image: "${body.image}"
published: true
---
`;

    const path = `content/produits/${body.title.replace(/\s+/g, "-").toLowerCase()}.md`;

    const res = await fetch(`https://api.github.com/repos/TON_COMPTE/TON_REPO/contents/${path}`, {
      method: "PUT",
      headers: {
        "Authorization": `token ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Ajout produit ${body.title}`,
        content: Buffer.from(content).toString("base64"),
        branch: "main"
      })
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

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
