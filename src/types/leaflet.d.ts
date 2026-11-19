declare module "leaflet" {
  export type LatLngTuple = [number, number];

  export interface LeafletLayer {
    addTo(map: LeafletMap): this;
    remove(): this;
  }

  export interface LeafletTileLayer extends LeafletLayer {
    on(event: "tileerror", handler: () => void): this;
    off(event: "tileerror", handler: () => void): this;
  }

  export interface LeafletMarker extends LeafletLayer {}

  export interface LeafletMap {
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
