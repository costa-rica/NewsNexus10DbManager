# NewsNexus10DbManager

## Project Overview
This is a TypeScript microservice for managing the NewsNexus10 database. It uses the NewsNexus10Db package with Sequelize to report status, delete stale articles, and import CSV backups from a zip file.

## Setup
1. Ensure the local dependency exists at `../NewsNexus10Db`.
   - To install directly (locally): `npm install file:../NewsNexus10Db`
2. Install dependencies: `npm install`.
3. Build the project: `npm run build`.

## Usage
- Run status check:
  - `npm run start`
- Delete articles older than the default (180 days):
  - `npm run start -- --delete_articles`
- Delete articles older than a specific number of days:
  - `npm run start -- --delete_articles 365`
- Import a zip backup of CSV files:
  - `npm run start -- --zip_file "/full/path/to/backup.zip"`
- Combine operations (import then delete, then status):
  - `npm run start -- --zip_file "/full/path/to/backup.zip" --delete_articles 180`

## Project Structure
```
NewsNexus10DbManager/
├── src/
│   ├── config/
│   │   └── logger.ts                 # Winston logger configuration
│   ├── modules/
│   │   ├── cli.ts                    # CLI argument parsing
│   │   ├── deleteArticles.ts         # Delete stale articles
│   │   ├── status.ts                 # Database status queries
│   │   └── zipImport.ts              # Zip-to-CSV import logic
│   ├── types/
│   │   ├── cli.ts                    # CLI option types
│   │   └── status.ts                 # Status result types
│   └── index.ts                      # Application entry point
├── docs/
│   ├── DATABASE_OVERVIEW.md
│   ├── LOGGING_NODE_JS_V06.md
│   ├── README-format.md
│   ├── REQUIREMENTS.md
│   └── reference/
│       └── adminDb.js
├── package.json
├── tsconfig.json
└── README.md
```

## .env
```
NODE_ENV=development
NAME_APP=NewsNexus10DbManager
PATH_TO_LOGS=/absolute/path/to/logs/
LOG_MAX_SIZE=5
LOG_MAX_FILES=5
PATH_DATABASE=/absolute/path/to/databases/NewsNexus10/
NAME_DB=newsnexus10.db
```

## External Files (optional)
### Zip Backup File
- Provide a zip file path with `--zip_file`.
- The zip should contain CSV files named after the database tables, such as `Article.csv` or `ArticleApproved.csv`.

## References
- `docs/LOGGING_NODE_JS_V06.md`
- `docs/DATABASE_OVERVIEW.md`
- `docs/REQUIREMENTS.md`
- `docs/reference/adminDb.js`
