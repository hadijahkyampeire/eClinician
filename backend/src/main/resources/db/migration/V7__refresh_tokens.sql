-- Signing in now hands back two tokens. The access token is short-lived and checked on
-- every call; this one is long-lived and can only be traded for a fresh access token.
-- Splitting them is what lets a session end on its own without ending the day's work:
-- the browser can ask for more time, and the server can refuse.
--
-- Only a SHA-256 hash of each token is stored, for the same reason passwords are hashed:
-- a leaked dump of this table cannot be replayed against the API.

CREATE TABLE refresh_tokens (
    id         uuid PRIMARY KEY,
    token_hash varchar(64)  NOT NULL UNIQUE,
    user_email varchar(150) NOT NULL,
    issued_at  timestamp(6) with time zone NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    -- Set when the token is spent, when the user signs out, or when a spent token is
    -- presented a second time and every token that user holds is torn up.
    revoked_at timestamp(6) with time zone
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_email);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at);
