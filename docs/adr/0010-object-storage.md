# ADR 0010: Private object storage

## Status

Accepted

## Context

Documents and media must not be anonymously readable from object storage.

## Decision

Use an S3-compatible abstraction with private buckets. Upload and download use short-lived signed URLs issued only after API authorization. Object keys are namespaced by organization or user.

## Consequences

- API stores metadata and authorization, not file bytes
- Local development uses MinIO
- Provider credentials stay in validated environment variables
