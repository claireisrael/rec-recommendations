import { Client, Account, Databases, Storage } from "appwrite";
import { appwriteConfig } from "./config";

function createAppwriteClient(): Client {
  const client = new Client();
  if (appwriteConfig.endpoint && appwriteConfig.projectId) {
    client
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId);
  }
  return client;
}

let _client: Client | null = null;
let _account: Account | null = null;
let _databases: Databases | null = null;
let _storage: Storage | null = null;

export function getClient(): Client {
  if (!_client) {
    _client = createAppwriteClient();
  }
  return _client;
}

export function getAccount(): Account {
  if (!_account) {
    _account = new Account(getClient());
  }
  return _account;
}

export function getDatabases(): Databases {
  if (!_databases) {
    _databases = new Databases(getClient());
  }
  return _databases;
}

export function getStorage(): Storage {
  if (!_storage) {
    _storage = new Storage(getClient());
  }
  return _storage;
}

export function createServerClient(): {
  client: Client;
  databases: Databases;
} {
  const serverClient = createAppwriteClient();
  return {
    client: serverClient,
    databases: new Databases(serverClient),
  };
}

export function isAppwriteConfigured(): boolean {
  return Boolean(appwriteConfig.endpoint && appwriteConfig.projectId);
}
