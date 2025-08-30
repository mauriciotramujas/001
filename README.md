# Advocatech

## Backblaze B2 Configuration

Set the following environment variables in your `.env` file:

- `B2_KEY_ID` – key ID for the primary bucket.
- `B2_APPLICATION_KEY` – application key for the primary bucket.
- `B2_BUCKET_NAME` – name of the primary bucket.
- `B2_BUCKET_ID` – optional ID of the primary bucket.

For workspaces under the `evolution-api/` prefix you can provide separate credentials:

- `B2_KEY_ID_EVO`
- `B2_APPLICATION_KEY_EVO`
- `B2_BUCKET_NAME_EVO` (optional when `B2_BUCKET_ID_EVO` is set)
- `B2_BUCKET_ID_EVO`

These variables allow the server to switch between buckets based on the workspace ID.
