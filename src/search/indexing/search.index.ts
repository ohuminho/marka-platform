export interface SearchDocument {
  id: string;
  type: "PRODUCT" | "SERVICE" | "VENDOR";
  title: string;
  keywords: string[];
}
