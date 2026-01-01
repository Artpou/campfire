const FLAGS_API_URL = "https://flagsapi.com";

export function getFlagUrl(country?: string) {
  if (!country) return "";
  country = country.toUpperCase() === "EN" ? "US" : country.toUpperCase();
  return `${FLAGS_API_URL}/${country}/flat/64.png`;
}
