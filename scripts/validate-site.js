"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.resolve(__dirname, "..");
const expectedPages = ["index.html", "tree-removal-knoxville-tn.html", "tree-trimming-knoxville-tn.html", "tree-care-knoxville-tn.html", "tree-contractors-knoxville-tn.html", "most-affordable-tree-service-knoxville-tn.html", "about.html", "editorial-methodology.html", "corrections.html", "privacy-policy.html", "terms-of-service.html"];
const requiredFooterLinks = ["about.html", "privacy-policy.html", "terms-of-service.html", "editorial-methodology.html", "corrections.html"];

function assert(condition, message) { if (!condition) throw new Error(message); }

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "js/data.js"), "utf8"), sandbox);
const providers = sandbox.window.DIRECTORY_DATA;
assert(Array.isArray(providers) && providers.length > 0 && providers.length <= 20, "Directory must be a small, non-empty curated list.");
const requiredKeys = ["id", "name", "website", "phone", "serviceAreas", "services", "emergencyServiceAdvertised", "summary", "verifiedOn", "sourceUrls"];
const ids = new Set(); const names = new Set();
providers.forEach((provider) => {
  assert(JSON.stringify(Object.keys(provider).sort()) === JSON.stringify([...requiredKeys].sort()), `Unexpected schema for ${provider.name || provider.id}`);
  assert(!ids.has(provider.id), `Duplicate id: ${provider.id}`);
  assert(!names.has(provider.name.toLowerCase()), `Duplicate provider: ${provider.name}`);
  ids.add(provider.id); names.add(provider.name.toLowerCase());
  assert(/^https?:\/\//.test(provider.website), `Invalid website for ${provider.name}`);
  assert(Array.isArray(provider.sourceUrls) && provider.sourceUrls.length > 0 && provider.sourceUrls.every((url) => /^https?:\/\//.test(url)), `Missing official source for ${provider.name}`);
  assert(Array.isArray(provider.services) && provider.services.length > 0, `Missing services for ${provider.name}`);
  assert(Array.isArray(provider.serviceAreas) && provider.serviceAreas.length > 0, `Missing areas for ${provider.name}`);
  assert(provider.serviceAreas.some((area) => /Knoxville|Knox County|East Tennessee/.test(area)), `Knoxville-area coverage not established for ${provider.name}`);
  assert(provider.verifiedOn === "2026-07-13", `Stale verification date for ${provider.name}`);
  assert(typeof provider.emergencyServiceAdvertised === "boolean", `Invalid emergency field for ${provider.name}`);
});

const shippedText = ["js/data.js", "js/app.js"].map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
["googleusercontent", "scrapedAt", "popular_times", "popularTimes", "owner_update", "ownerUpdates", "review_count", "reviewCount", "enrichment", "employeeDetails", "rating:", "reviews:"].forEach((token) => assert(!shippedText.includes(token), `Forbidden scraped-data token remains: ${token}`));
const emails = [...shippedText.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map((match) => match[0].toLowerCase());
assert(emails.every((email) => email === "kredfox4@gmail.com"), "Non-publisher email remains in shipped JavaScript.");

expectedPages.forEach((file) => {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  assert(/<main\b/.test(html) && /<footer\b/.test(html), `Missing semantic main/footer: ${file}`);
  assert(/rel="canonical"/.test(html), `Missing canonical: ${file}`);
  requiredFooterLinks.forEach((link) => assert(html.includes(`href="${link}"`), `Missing global footer link ${link} in ${file}`));
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const ref = match[1].split(/[?#]/)[0];
    if (!ref || /^(?:https?:|mailto:|tel:|data:)/.test(ref)) continue;
    const local = ref.startsWith("/") ? ref.slice(1) : ref;
    assert(fs.existsSync(path.join(root, local)), `Broken internal reference in ${file}: ${ref}`);
  }
});

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const sitemapPaths = [...sitemap.matchAll(/<loc>https:\/\/knoxvilletreesservices\.com\/(.*?)<\/loc>/g)].map((match) => match[1] || "index.html");
assert(sitemapPaths.length === expectedPages.length, "Sitemap page count does not match canonical page count.");
expectedPages.forEach((file) => assert(sitemapPaths.includes(file), `Sitemap missing ${file}`));
assert(fs.readFileSync(path.join(root, "ads.txt"), "utf8").includes("pub-2655194428154886"), "ads.txt publisher id is missing.");
assert(fs.readFileSync(path.join(root, "robots.txt"), "utf8").includes("https://knoxvilletreesservices.com/sitemap.xml"), "robots.txt sitemap is missing.");
console.log(`Validated ${providers.length} curated providers and ${expectedPages.length} canonical pages.`);
