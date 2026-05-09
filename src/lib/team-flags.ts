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
  Portugal: "🇵🇹",
  Netherlands: "🇳🇱",
  Italy: "🇮🇹",
  Belgium: "🇧🇪",
  Croatia: "🇭🇷",
  Switzerland: "🇨🇭",
  Denmark: "🇩🇰",
  Austria: "🇦🇹",
  Poland: "🇵🇱",
  Turkey: "🇹🇷", Türkiye: "🇹🇷",
  Norway: "🇳🇴",
  Ukraine: "🇺🇦",

  // AFC (8)
  Japan: "🇯🇵",
  "South Korea": "🇰🇷", "Korea Republic": "🇰🇷", Korea: "🇰🇷",
  Iran: "🇮🇷", "IR Iran": "🇮🇷",
  Australia: "🇦🇺",
  "Saudi Arabia": "🇸🇦",
  Uzbekistan: "🇺🇿",
  Jordan: "🇯🇴",
  Iraq: "🇮🇶",

  // CAF (10)
  Morocco: "🇲🇦",
  Tunisia: "🇹🇳",
  Egypt: "🇪🇬",
  Algeria: "🇩🇿",
  Senegal: "🇸🇳",
  Nigeria: "🇳🇬",
  "Ivory Coast": "🇨🇮", "Côte d'Ivoire": "🇨🇮",
  Cameroon: "🇨🇲",
  Ghana: "🇬🇭",
  Mali: "🇲🇱",

  // CONCACAF (3, hosts already listed)
  Panama: "🇵🇦",
  Jamaica: "🇯🇲",
  "Costa Rica": "🇨🇷",

  // OFC (1)
  "New Zealand": "🇳🇿",
};

export function getFlag(teamName: string | null | undefined): string {
  if (!teamName) return "🏳️";
  return NAME_TO_FLAG[teamName] ?? "🏳️";
}
