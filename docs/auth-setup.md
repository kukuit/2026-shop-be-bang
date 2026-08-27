# Authentication setup

## Environment

Copy the authentication entries from `.env.example` into `.env.local`. Generate a unique production secret with at least 32 characters. Access tokens expire after 15 minutes and refresh sessions expire after 30 days.

## Enable an existing user

Set `INITIAL_USER_PASSWORD` only in the local shell or `.env.local`, then run:

```powershell
npm.cmd run auth:set-password -- --user-id USER_DOCUMENT_ID --username USERNAME --display-name "DISPLAY NAME" --role admin
```

The helper checks duplicate normalized usernames and stores only a bcrypt hash. It does not edit game history.

## Inspect and map legacy game data

Dry run first:

```powershell
npm.cmd run auth:map-legacy-game -- --target-user-id USER_DOCUMENT_ID
```

After confirming every legacy record belongs to that user:

```powershell
npm.cmd run auth:map-legacy-game -- --target-user-id USER_DOCUMENT_ID --apply
```

The migration updates `userId`, adds migration audit fields, and never deletes records. Firestore automatically indexes the single-field username query used by login; no composite index is required for the current auth queries.
