export interface DatabaseClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export class MockDatabase implements DatabaseClient {
  async connect() {
    console.log("Database connected");
  }

  async disconnect() {
    console.log("Database disconnected");
  }
}
