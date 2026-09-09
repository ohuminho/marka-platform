export interface SearchIndexItem {
  id: string;
  type: "PRODUCT" | "SERVICE" | "VENDOR";
  title: string;
  keywords: string[];
}
