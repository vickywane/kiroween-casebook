This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Design

- Figma: [Sherlock design file](https://www.figma.com/design/ly8oJl6FNfD8nuGesz7dR4/Sherlock)

## Docs

### Architecture

- [Data pipeline](docs/architecture.md): how source data is downloaded, checked, enriched and published to the app.

In short: the app never queries the upstream sources while someone is browsing. A pipeline on AWS (S3, Step Functions, ECS Fargate, EventBridge, Bedrock) downloads each source, enforces the data rules once, geocodes and summarises records, and publishes a read-only SQLite database. The Next.js API routes read only from that database, and every row keeps its source link, licence and retrieval date. The police.uk step runs locally today (`yarn ingest:police`, tests with `yarn test:etl`). The other sources and the AWS deployment are still planned, and the app still reads mock data.

| Source | Licence |
|---|---|
| police.uk street-level crime and outcomes | Open Government Licence v3.0 |
| Old Bailey Proceedings, 1674–1913 | To confirm before commercial use (see the architecture doc) |
| MoJ Outcomes by Offence | Open Government Licence v3.0 |
| London Datastore: MPS recorded crime | Open Government Licence |
| Find Case Law (metadata and on-demand links only) | Open Justice Licence v2.0 |
| Wikidata | CC0 |
| NLS historic map tiles | Free for non-commercial use, credit required |

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
