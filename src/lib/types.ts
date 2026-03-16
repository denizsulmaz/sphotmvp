export interface Photographer {
  ID: string;
  Name: string;
  "Delivery Time": string;
  "Global Categories": string;
  Instagram: string;
  "URL Instagram": string;
  Languages: string;
  "English Level": string;
  "Other (Languages)": string;
  "Location Types": string;
  "Min Price KRW(per hour & starting from)": string;
  "Response Speed": string;
  Style: string;
  "Style (Other)": string;
  IsStudio?: boolean;
}

export const CATEGORIES = [
  "Hanbok",
  "Family",
  "Couple",
  "Individual",
  "Wedding",
  "Editorial",
  "Lifestyle",
  "Event",
  "Business",
  "Branding",
  "Sports",
];
