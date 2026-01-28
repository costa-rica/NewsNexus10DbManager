# NewsNexus10DbManager Requirements

This will be a TypeScript microservice. That will connect to the NewsNexus10 database and provide functionality to manage the database. The connection uses the custom package NewsNexus10Db. This microservice will use an src/ directory to store the source code and an index.ts file to run the application. The service should be modular storing all the module functions in src/modules/ directory. Use src/types/ to store the type definitions.

## Status

This will be run by just typing "npm run start" in the terminal. It will give the status of the database.

I want to create a database manager service that will:
Give status of articles. The status I want to see is:

- Count of articles in the Articles table.
- Count of articles (using articleId) with rows in the ArticlesRelevants table where isRelevent=0
- Count of articles (using articleId) with rows in the ArticleApproveds table
- Count of articles (using articleId) in the Articles table with publishedDate prior to 180 days from today.

## Delete Articles

Next, I want to add the ability to delete any article that does not have a row in ArticlesRelevants or ArticleApproveds tables and is older than a certain amount of days from today. This should be executed using the argument "--delete_articles [number of days]". if no number of days is provided, default to 180 days.

## Zip File

The database backups are made by creating .csv files for each table them zipping them up in one zip file.
I want to add the ability to receive an argument “--zip_file [full path to zip file and name]” then update the database with the contents of the zip file. The zip file contains csv files with the schema names of all the tables such as “Article.csv”.

In the docs/references/adminDb.js I have added reference functions used to replenish the database from the ExpressJS API application. This currently works and we should use this as guideance to create the functionality for this microservice.

## Logging

Use the LOGGING_NODE_JS_V06.md file as a guide for logging.

## Database Overview

Use the DATABASE_OVERVIEW.md file as a guide for the database schema.

## README

Use the README-format.md file as a guide for the README file.
