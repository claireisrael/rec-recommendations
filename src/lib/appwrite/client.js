import { Client, Account, Databases, Storage } from "appwrite";
import { appwriteConfig } from "./config";

function createAppwriteClient() {
  const client = new Client();
  if (appwriteConfig.endpoint && appwriteConfig.projectId) {
    client
      .setEndpoint(appwriteConfig.endpoint)
      .setProject(appwriteConfig.projectId);
  }
  return client;
}

/** @type {Client | null} */
let _client = null;
/** @type {Account | null} */
let _account = null;
/** @type {Databases | null} */
let _databases = null;
/** @type {Storage | null} */
let _storage = null;

export function getClient() {
  if (!_client) {
    _client = createAppwriteClient();
  }
  return _client;
}

export function getAccount() {
  if (!_account) {
    _account = new Account(getClient());
  }
  return _account;
}

export function getDatabases() {
  if (!_databases) {
    _databases = new Databases(getClient());
  }
  return _databases;
}

export function getStorage() {
  if (!_storage) {
    _storage = new Storage(getClient());
  }
  return _storage;
}

export function createServerClient() {
  const serverClient = createAppwriteClient();
  return {
    client: serverClient,
    databases: new Databases(serverClient),
  };
}

export function isAppwriteConfigured() {
  return Boolean(appwriteConfig.endpoint && appwriteConfig.projectId);
}
