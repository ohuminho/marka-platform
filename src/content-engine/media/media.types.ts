export interface MediaAsset {
  id: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
  url: string;
  ownerId: string;
}
