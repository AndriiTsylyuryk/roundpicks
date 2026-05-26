// Country code (ISO 3166-1 alpha-2) lookup for flag libraries.
// `react-world-flags` accepts codes like "nl", "gb-eng", "us".

const NAME_TO_CODE: Record<string, string> = {
  // Hosts (3)
  "United States": "us", USA: "us",
  Canada: "ca",
  Mexico: "mx",

  // CONMEBOL (7)
  Argentina: "ar",
  Brazil: "br",
  Uruguay: "uy",
  Colombia: "co",
  Ecuador: "ec",
  Paraguay: "py",
  Bolivia: "bo",

  // UEFA (16)
  France: "fr",
  Spain: "es",
  Germany: "de",
  England: "gb-eng",
  Scotland: "gb-sct",
  Portugal: "pt",
  Netherlands: "nl",
  Belgium: "be",
  Croatia: "hr",
  Switzerland: "ch",
  Austria: "at",
  Turkey: "tr", Türkiye: "tr",
  Norway: "no",
  Sweden: "se",
  Czechia: "cz", "Czech Republic": "cz",
  "Bosnia-H.": "ba", "Bosnia-Herzegovina": "ba",

  // AFC (8)
  Japan: "jp",
  "South Korea": "kr", "Korea Republic": "kr", Korea: "kr",
  Iran: "ir", "IR Iran": "ir",
  Australia: "au",
  "Saudi Arabia": "sa",
  Uzbekistan: "uz",
  Jordan: "jo",
  Iraq: "iq",
  Qatar: "qa",

  // CAF (9)
  Morocco: "ma",
  Tunisia: "tn",
  Egypt: "eg",
  Algeria: "dz",
  Senegal: "sn",
  "Ivory Coast": "ci", "Côte d'Ivoire": "ci",
  Ghana: "gh",
  "South Africa": "za",
  "Cape Verde": "cv", "Cape Verde Islands": "cv",
  "Congo DR": "cd", "DR Congo": "cd",

  // CONCACAF (6, hosts already listed)
  Panama: "pa",
  Haiti: "ht",
  Curaçao: "cw",

  // OFC (1)
  "New Zealand": "nz",
};

export function getFlag(teamName: string | null | undefined): string {
  if (!teamName) return "";
  const code = NAME_TO_CODE[teamName];
  if (!code) return "";
  if (code.length === 2) {
    const chars = [...code.toUpperCase()].map((c) =>
      String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65),
    );
    return chars.join("");
  }
  return "";
}

export function getFlagCode(teamName: string | null | undefined): string | null {
  if (!teamName) return null;
  return NAME_TO_CODE[teamName] ?? null;
}
