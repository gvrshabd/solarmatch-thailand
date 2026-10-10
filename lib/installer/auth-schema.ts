/** Better Auth native D1 schema. Applied by the shared migration, never at runtime. */
export const installerAuthDDL = `
CREATE TABLE IF NOT EXISTS installer_auth_user (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, emailVerified INTEGER NOT NULL, image TEXT, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS installer_auth_session (id TEXT PRIMARY KEY NOT NULL, expiresAt INTEGER NOT NULL, token TEXT NOT NULL UNIQUE, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, ipAddress TEXT, userAgent TEXT, userId TEXT NOT NULL REFERENCES installer_auth_user(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS installer_auth_session_user_idx ON installer_auth_session(userId);
CREATE TABLE IF NOT EXISTS installer_auth_account (id TEXT PRIMARY KEY NOT NULL, accountId TEXT NOT NULL, providerId TEXT NOT NULL, userId TEXT NOT NULL REFERENCES installer_auth_user(id) ON DELETE CASCADE, accessToken TEXT, refreshToken TEXT, idToken TEXT, accessTokenExpiresAt INTEGER, refreshTokenExpiresAt INTEGER, scope TEXT, password TEXT, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS installer_auth_account_user_idx ON installer_auth_account(userId);
CREATE UNIQUE INDEX IF NOT EXISTS installer_auth_account_provider_idx ON installer_auth_account(providerId, accountId);
CREATE TABLE IF NOT EXISTS installer_auth_verification (id TEXT PRIMARY KEY NOT NULL, identifier TEXT NOT NULL, value TEXT NOT NULL, expiresAt INTEGER NOT NULL, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS installer_auth_verification_identifier_idx ON installer_auth_verification(identifier);
CREATE TABLE IF NOT EXISTS installer_auth_rate_limit (id TEXT PRIMARY KEY NOT NULL, key TEXT NOT NULL UNIQUE, count INTEGER NOT NULL, lastRequest INTEGER NOT NULL);
`;
