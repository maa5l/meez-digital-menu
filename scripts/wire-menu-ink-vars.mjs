import fs from "node:fs";

const files = [
  "src/components/menu/ProductCardParts.tsx",
  "src/components/menu/product/ProductCenteredCard.tsx",
  "src/components/menu/product/ProductListItemLabel.tsx",
].filter((f) => fs.existsSync(f));

const replacements = [
  [/text-\[#1a1a1a\]\/85/g, "text-[color:color-mix(in_srgb,var(--menu-ink,#1a1a1a)_85%,transparent)]"],
  [/text-\[#1a1a1a\]\/55/g, "text-[color:color-mix(in_srgb,var(--menu-ink,#1a1a1a)_55%,transparent)]"],
  [/text-\[#1a1a1a\]\/50/g, "text-[color:color-mix(in_srgb,var(--menu-ink,#1a1a1a)_50%,transparent)]"],
  [/text-\[#1a1a1a\]\/35/g, "text-[color:color-mix(in_srgb,var(--menu-ink,#1a1a1a)_35%,transparent)]"],
  [/text-\[#1a1a1a\]/g, "text-[color:var(--menu-ink,#1a1a1a)]"],
  [/color:\s*"#1a1a1a"/g, 'color: "var(--menu-ink, #1a1a1a)"'],
  [/color:\s*'#1a1a1a'/g, "color: 'var(--menu-ink, #1a1a1a)'"],
];

for (const file of files) {
  let source = fs.readFileSync(file, "utf8");
  let hits = 0;
  for (const [pattern, next] of replacements) {
    const before = source;
    source = source.replace(pattern, next);
    if (source !== before) hits += 1;
  }
  fs.writeFileSync(file, source);
  console.log(`${file}: ${hits} replacement groups`);
}
