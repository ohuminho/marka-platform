declare module "leaflet" {
  export type LatLngTuple = [number, number];

  export interface LeafletLayer {
    addTo(map: LeafletMap): this;
    remove(): this;
  }

  export interface LeafletTileLayer extends LeafletLayer {
    on(event: "tileerror" | "tileload", handler: () => void): this;
    off(event: "tileerror" | "tileload", handler: () => void): this;
  }

  export type LeafletMarker = LeafletLayer;

  export interface LeafletMap {
    getContainer(): HTMLElement;
    on(event: "click", handler: (event: { latlng: { lat: number; lng: number } }) => void): this;
    setView(center: LatLngTuple, zoom: number): this;
    addControl(control: unknown): this;
    removeLayer(layer: LeafletLayer): this;
    invalidateSize(options?: { pan?: boolean }): this;
    fitBounds(bounds: unknown, options?: { padding?: [number, number]; maxZoom?: number }): this;
    remove(): void;
  }

  export interface LeafletApi {
    map(element: HTMLElement, options?: Record<string, unknown>): LeafletMap;
    control: {
      zoom(options?: { position?: string }): { addTo(map: LeafletMap): unknown };
    };
    tileLayer(url: string, options?: Record<string, unknown>): LeafletTileLayer;
    divIcon(options: { className?: string; html?: string; iconSize?: [number, number]; iconAnchor?: [number, number] }): unknown;
    marker(position: LatLngTuple, options?: { icon?: unknown; keyboard?: boolean }): LeafletMarker;
    polyline(positions: LatLngTuple[], options?: Record<string, unknown>): LeafletLayer;
    latLngBounds(positions: LatLngTuple[]): unknown;
  }

  const leaflet: LeafletApi;
  export default leaflet;
}
