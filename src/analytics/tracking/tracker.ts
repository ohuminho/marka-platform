import { AnalyticsEvent } from "../events/event.types";

export class Tracker {
  track(event: AnalyticsEvent) {
    console.log("Analytics event:", event);
  }
}
