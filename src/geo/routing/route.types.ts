export interface Route {
  id: string;
  origin: Location;
  destination: Location;
  distance: number;
  estimatedTime: number;
}
