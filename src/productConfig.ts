export const DEFAULT_REPORT_PRICE_CENTS = 24900;
export const DEFAULT_SUPPORT_EMAIL = "support@slipstreamseo.com";
export const DEFAULT_DELIVERY_TIMEFRAME = "Most reports arrive within 15 minutes.";
export const BUSINESS_IDENTITY = "Slipstream SEO, an independent local visibility reporting service.";

export function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
