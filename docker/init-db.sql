-- Enable pgvector extension for AI semantic search on AlloyDB / PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS open_judy;

-- Grants
GRANT ALL ON SCHEMA open_judy TO judy_user;
GRANT ALL ON SCHEMA public TO judy_user;
