export class LoggerService {
  info(message: string, metadata?: object) {
    console.log(
      JSON.stringify({
        level: "INFO",
        message,
        metadata,
        timestamp: new Date(),
      })
    );
  }

  warn(message: string, metadata?: object) {
    console.warn(
      JSON.stringify({
        level: "WARN",
        message,
        metadata,
        timestamp: new Date(),
      })
    );
  }

  error(message: string, metadata?: object) {
    console.error(
      JSON.stringify({
        level: "ERROR",
        message,
        metadata,
        timestamp: new Date(),
      })
    );
  }
}
