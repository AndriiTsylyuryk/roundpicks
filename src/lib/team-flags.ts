// 48 likely qualifiers for FIFA World Cup 2026.
// Keys cover both football-data.org `shortName` and `name` variants.

const NAME_TO_FLAG: Record<string, string> = {
  // Hosts (3)
  "United States": "🇺🇸", USA: "🇺🇸",
  Canada: "🇨🇦",
  Mexico: "🇲🇽",

  // CONMEBOL (7)
  Argentina: "🇦🇷",
  Brazil: "🇧🇷",
  Uruguay: "🇺🇾",
  Colombia: "🇨🇴",
  Ecuador: "🇪🇨",
  Paraguay: "🇵🇾",
  Bolivia: "🇧🇴",

  // UEFA (16)
  France: "🇫🇷",
  Spain: "🇪🇸",
  Germany: "🇩🇪",
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  Portugal: "🇵🇹",
  Netherlands: "🇳🇱",
  Belgium: "🇧🇪",
  Croatia: "🇭🇷",
  Switzerland: "🇨🇭",
  Austria: "🇦🇹",
  Turkey: "🇹🇷", Türkiye: "🇹🇷",
  Norway: "🇳🇴",
  Sweden: "🇸🇪",
  Czechia: "🇨🇿", "Czech Republic": "🇨🇿",
  "Bosnia-H.": "🇧🇦", "Bosnia-Herzegovina": "🇧🇦",

  // AFC (8)
  Japan: "🇯🇵",
  "South Korea": "🇰🇷", "Korea Republic": "🇰🇷", Korea: "🇰🇷",
  Iran: "🇮🇷", "IR Iran": "🇮🇷",
  Australia: "🇦🇺",
  "Saudi Arabia": "🇸🇦",
  Uzbekistan: "🇺🇿",
  Jordan: "🇯🇴",
  Iraq: "🇮🇶",
  Qatar: "🇶🇦",

  // CAF (9)
  Morocco: "🇲🇦",
  Tunisia: "🇹🇳",
  Egypt: "🇪🇬",
  Algeria: "🇩🇿",
  Senegal: "🇸🇳",
  "Ivory Coast": "🇨🇮", "Côte d'Ivoire": "🇨🇮",
  Ghana: "🇬🇭",
  "South Africa": "🇿🇦",
  "Cape Verde": "🇨🇻", "Cape Verde Islands": "🇨🇻",
  "Congo DR": "🇨🇩", "DR Congo": "🇨🇩",

  // CONCACAF (6, hosts already listed)
  Panama: "🇵🇦",
  Haiti: "🇭🇹",
  Curaçao: "🇨🇼",

  // OFC (1)
  "New Zealand": "🇳🇿",
};

export function getFlag(teamName: string | null | undefined): string {
  if (!teamName) return "🏳️";
  return NAME_TO_FLAG[teamName] ?? "🏳️";
}
