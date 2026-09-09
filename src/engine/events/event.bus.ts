import { MarkaEvent } from "./event.types";

type EventHandler = (event: MarkaEvent) => void;

export class EventBus {
  private handlers: Record<string, EventHandler[]> = {};

  subscribe(eventName: string, handler: EventHandler) {
    if (!this.handlers[eventName]) {
      this.handlers[eventName] = [];
    }

    this.handlers[eventName].push(handler);
  }

  publish(event: MarkaEvent) {
    const listeners = this.handlers[event.name] || [];

    listeners.forEach((handler) => {
      handler(event);
    });
  }
}
