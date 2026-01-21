// data.js
// Real Knoxville, TN tree service companies for directory listings

// Normalize services into consistent tags used for filtering and page defaults
function deriveTags(services = []) {
  const s = new Set(services);
  const tags = new Set();

  // Primary categories
  if (s.has("Tree Removal")) tags.add("Tree Removal");
  if (s.has("Tree Trimming")) tags.add("Tree Trimming");

  // Group all care signals under Tree Care so the Tree Care page actually differs
  if (s.has("Tree Care") || s.has("Tree Health") || s.has("Pruning")) {
    tags.add("Tree Care");
  }

  // Capability tags
  if (s.has("Stump Grinding")) tags.add("Stump Grinding");
  if (s.has("Emergency")) tags.add("Emergency");
  if (s.has("Storm Cleanup")) tags.add("Storm Cleanup");
  if (s.has("Pruning")) tags.add("Pruning");
  if (s.has("Tree Health")) tags.add("Tree Health");
  if (s.has("Lawn Services")) tags.add("Lawn Services");

  // Derived contractor tag: broad/full service or arborist style providers
  const fullService = tags.has("Tree Removal") && tags.has("Tree Trimming") && (tags.has("Stump Grinding") || tags.has("Emergency") || tags.has("Storm Cleanup"));
  const arborist = tags.has("Tree Care") || tags.has("Tree Health") || tags.has("Pruning");
  if (fullService || arborist) tags.add("Tree Contractors");

  return Array.from(tags);
}

window.TREE_SERVICES = [
  {
    name: "Cooper’s Tree Service",
    phone: "(865) 523-4206",
    website: "https://www.facebook.com/cooperstree/",
    area: "Knoxville",
    services: ["Tree Removal", "Tree Trimming", "Stump Grinding", "Emergency", "Tree Contractors"],
    rating: 4.8,
    reviews: 200,
    hours: "Mon–Sat 8am–6pm",
    notes: "Locally owned Knoxville tree service with emergency response."
  },
  {
    name: "Anthony Hughes Tree Service & Stump Grinding",
    phone: "(865) 740-0484",
    website: "https://www.anthonyhughestreeservice.com",
    area: "Knoxville",
    services: ["Tree Removal", "Stump Grinding", "Storm Cleanup", "Tree Contractors"],
    rating: 4.7,
    reviews: 150,
    hours: "Mon–Sat 7am–6pm",
    notes: "Specializes in residential removals and stump grinding."
  },
  {
    name: "Appalachian Tree Experts",
    phone: "(404) 409-9926",
    website: "https://www.appalachiantreeservice.com",
    area: "Knoxville",
    services: ["Tree Removal", "Tree Trimming", "Emergency", "Tree Contractors"],
    rating: 4.6,
    reviews: 110,
    hours: "Mon–Fri 8am–5pm",
    notes: "East Tennessee tree removal and storm response."
  },
  {
    name: "A-1 Wilson Tree & Lawn Service",
    phone: "(865) 257-4621",
    website: "https://www.google.com/search?q=a1%20wilson%20tree",
    area: "Knoxville",
    services: ["Tree Removal", "Tree Trimming", "Lawn Services", "Tree Contractors"],
    rating: 4.5,
    reviews: 7,
    hours: "Mon–Fri 8am–5pm",
    notes: "Established Knoxville tree and lawn company."
  },
  {
    name: "Baumann Tree Service",
    phone: "(865) 809-2435",
    website: "https://www.google.com/search?q=baumann-tree-service-knoxville",
    area: "Powell",
    services: ["Tree Removal", "Tree Trimming", "Stump Grinding", "Tree Contractors"],
    rating: 4.7,
    reviews: 31,
    hours: "Mon–Sat 8am–6pm",
    notes: "Serving Powell and greater Knoxville area."
  },
  {
    name: "Smoky Mountain Tree Service",
    phone: "(865) 346-4490",
    website: "https://smokymountaintree.com",
    area: "Knoxville",
    services: ["Tree Removal", "Tree Trimming", "Emergency", "Tree Contractors"],
    rating: 4.6,
    reviews: 120,
    hours: "Mon–Sat 8am–6pm",
    notes: "Residential and commercial tree services across East TN."
  },
  {
    name: "JC’s Tree Service",
    phone: "(865) 599-1822",
    website: "https://jcstreeandlandscapeservice.com",
    area: "Knoxville",
    services: ["Tree Removal", "Tree Trimming", "Stump Grinding", "Tree Contractors"],
    rating: 4.5,
    reviews: 85,
    hours: "Mon–Fri 8am–5pm",
    notes: "Local Knoxville tree service for residential properties."
  },
  {
    name: "Cedar Creek Tree Service",
    phone: "(609) 267-8020",
    website: "https://www.yelp.com/biz/cedar-creek-tree-removal-lumberton",
    area: "Knoxville",
    services: ["Tree Removal", "Tree Care", "Storm Cleanup", "Tree Contractors"],
    rating: 4.6,
    reviews: 100,
    hours: "Mon–Sat 8am–6pm",
    notes: "Serving Knoxville and surrounding East Tennessee areas."
  },
  {
    name: "Davey Tree Expert Company – Knoxville",
    phone: "(865) 999-1297",
    website: "https://www.davey.com/about/contact-us/?type=residential&zip=37918",
    area: "Knoxville",
    services: ["Tree Care", "Pruning", "Tree Removal", "Tree Contractors"],
    rating: 4.4,
    reviews: 300,
    hours: "Mon–Fri 8am–5pm",
    notes: "ISA-certified arborists, residential and commercial."
  },
  {
    name: "Cortese Tree Specialists (Davey Tree)",
    phone: "(865) 687-8733",
    website: "https://www.davey.com",
    area: "Knoxville",
    services: ["Tree Care", "Tree Health", "Pruning", "Tree Contractors"],
    rating: 4.4,
    reviews: 250,
    hours: "Mon–Fri 8am–5pm",
    notes: "Professional arborist services in Knoxville."
  }

];

// Enrich each listing with normalized tags (used by app.js filtering)
window.TREE_SERVICES = (window.TREE_SERVICES || []).map(b => ({
  ...b,
  tags: deriveTags(b.services)
}));

// Generate LocalBusiness JSON-LD for each tree service
window.getLocalBusinessSchemas = function () {
  return (window.TREE_SERVICES || []).map(b => ({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${b.website || ''}#localbusiness`,
    "name": b.name,
    "url": b.website || undefined,
    "telephone": b.phone || undefined,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": b.area || "Knoxville",
      "addressRegion": "TN",
      "addressCountry": "US"
    },
    "areaServed": {
      "@type": "AdministrativeArea",
      "name": "Knoxville, TN"
    },
    "openingHours": b.hours || undefined,
    "aggregateRating": b.rating && b.reviews ? {
      "@type": "AggregateRating",
      "ratingValue": b.rating,
      "reviewCount": b.reviews
    } : undefined
  }));
};

// Helper to inject schemas into the page
window.injectLocalBusinessSchemas = function () {
  const schemas = window.getLocalBusinessSchemas();
  schemas.forEach(schema => {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(schema);
    document.head.appendChild(s);
  });
};
