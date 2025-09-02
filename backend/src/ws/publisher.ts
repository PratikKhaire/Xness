import { createClient, RedisClientType } from "redis";

let publisher: RedisClientType | null = null;

export async function getPublisher(): Promise<RedisClientType> {
  if (publisher && publisher.isOpen) return publisher;
  publisher = createClient();
  await publisher.connect();
  return publisher;
}
