"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
const files = [
  ...fs.readdirSync(root).filter((name) => name.endsWith(".html")),
  "ads.txt", "BingSiteAuth.xml", "CNAME", "favicon.ico", "icon.png",
  "og-tree-directory.jpg", "robots.txt", "site.webmanifest", "sitemap.xml"
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
files.forEach((name) => fs.copyFileSync(path.join(root, name), path.join(output, name)));
["css", "js"].forEach((directory) => fs.cpSync(path.join(root, directory), path.join(output, directory), { recursive: true }));

const expected = ["index.html", "privacy-policy.html", "terms-of-service.html", "editorial-methodology.html", "corrections.html", "js/app.js", "js/data.js", "css/style.css", "ads.txt", "CNAME", "sitemap.xml", "og-tree-directory.jpg"];
expected.forEach((name) => {
  if (!fs.existsSync(path.join(output, name))) throw new Error(`Build output is missing ${name}`);
});

console.log(`Built ${files.length} root files plus css/ and js/ into dist/.`);
