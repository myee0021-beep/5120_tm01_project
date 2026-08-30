# Repository Credential Review Confirmation

Date: 30 August 2026
Repository: `myee0021-beep/5120_tm01_project`

## O47 confirmation

The repository and the available commit history were reviewed for exposed database credentials and common API credential patterns.

Review checks included:

- PostgreSQL / Neon connection strings (`postgresql://`)
- Neon-style password/token fragments (`npg_`)
- hard-coded `DATABASE_URL` values
- `Authorization` / `Bearer` credentials
- common `apiKey` patterns
- backend-related commits, including reverted backend work

No real database credential or API credential was found in the reviewed repository history. The only PostgreSQL URL committed to the repository is the placeholder example in `.dev.vars.example`:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

The application reads the production connection string from the Cloudflare runtime secret `DATABASE_URL`. The real Neon connection string must remain in the platform secret store and must not be committed to GitHub.

A `.gitignore` is included to prevent `.dev.vars`, `.env`, `.env.*`, Wrangler local state, and `node_modules` from being committed accidentally.

## Repository-side confirmation

For the repository side of O47, the expected production arrangement is:

```text
GitHub source code
    -> references env.DATABASE_URL only
Cloudflare platform secret store
    -> holds the real DATABASE_URL value
Neon PostgreSQL
    -> receives the connection from the Worker at runtime
```

This document records the repository-side review. Database-side credential/storage confirmation should be completed separately by the database owner where required by the project security plan.
