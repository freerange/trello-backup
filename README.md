<img src="https://healthchecks.io/badge/311aafdb-71ec-4397-865b-d6437d/1YwAknpr/trello-backup.svg" />

## Introduction

We use the AWS Cloud Development Kit (CDK) to deploy this Trello Backup application to AWS.

The enumerateBoards Lambda function runs on a schedule and iterates over the Trello boards accessible to the user identified by the `TRELLO_KEY` and `TRELLO_TOKEN`. It publishes a message about each board using the Simple Notification Service (SNS).

The backupBoard Lambda function subscribes to the messages published by enumerateBoards and, for each Trello board, downloads the recent data from that board and stores the data to an S3 bucket.

The checkBoardBackups Lambda function is scheduled to run after we expect the backup to have completed and checks that the backups have been created as expected. It updates our monitoring service (healthchecks.io) with the success or failure of the backup job. It additionally sends us an email if the backup failed.

## Requirements

* bash
* node
* npm
* ruby
* bundler

## Setup

### Install ruby

    rbenv install

**NOTE**. If you're not using rbenv then be sure to install the version in .ruby-version.

### Install node

    nvm install

**NOTE**. If you're not using nvm then be sure to install the version in .nvmrc.

### Install node packages

    npm ci

### Configure AWS

You need the credentials of an AWS IAM user that has permission to create, modify and delete all the AWS resources used in this CDK application.

    aws configure

### Getting a Trello API key

**NOTE**. If you're modifying an existing stack then you'll want to get the existing value from the deployed version. See the section on Environment Variables below for more information.

Ensure you're signed in to [Trello][] as a user with access to the relevant boards.

    $ open "https://trello.com/1/appKey/generate"
    # Copy the Key (under Developer API Keys) to the clipboard

    # Temporarily store the Trello API key in an environment variable
    $ export TRELLO_KEY=`pbpaste`

    # Store the Trello API key in AWS Secrets Manager
    $ aws secretsmanager create-secret --name /trello-backup/TRELLO_KEY --secret-string "$TRELLO_KEY"

### Getting a Trello API token

**NOTE**. If you're modifying an existing stack then you'll want to get the existing value from the deployed version. See the section on Environment Variables below for more information.

Ensure you're signed in to [Trello][] as a user with access to the relevant boards. It's safe to do this step multiple times as you'll get the same token back even if it's already been generated.

    $ open "https://trello.com/1/connect?key=$TRELLO_KEY&name=$TRELLO_APP_NAME&expiration=never&response_type=token"
    # Allow the Trello backup "app" to read our Trello account

    # Copy the token from the resulting page

    # Temporarily store the Trello token in an environment variable
    $ export TRELLO_TOKEN=`pbpaste`

    # Store the Trello API token in AWS Secrets Manager
    $ aws secretsmanager create-secret --name /trello-backup/TRELLO_TOKEN --secret-string "$TRELLO_TOKEN"

### Environment variables

The following are injected into the AWS Lambda functions from the AWS Secrets Manager as environment variables:

* `TRELLO_KEY` - secret used in all 3 Lambda functions to authenticate with Trello
* `TRELLO_TOKEN` - secret used in all 3 Lambda functions to authenticate with Trello

In the `.env` file, set the following environment variables:

* `TRELLO_BACKUP_CARD_MODIFIED_SINCE` - used in the backupBoard function to query Trello for cards modified since a certain date
* `TRELLO_BACKUP_OLDEST_ALLOWED_BACKUP_IN_SECONDS` - used by checkBoardBackups to determine whether the latest backup is recent enough e.g. `1800` only allows backups to be 30 minutes old; older backups trigger an error
* `HEALTHCHECKS_ENDPOINT_URL` - used by checkBoardBackups function to record the success/failure of the function
* `TRELLO_BACKUP_MONITORING_EMAIL_ADDRESS` - the email address where monitoring emails will be sent (an email will be sent on first deployment to ask you to confirm the subscription)
* `TRELLO_BACKUP_SCHEDULE_FOR_BACKUP` - specifies how often/when the backup is performed, e.g. `cron(0 2 * * ? *)` runs daily at 2am (see [Schedule Expressions for Rules][3] for details)
* `TRELLO_BACKUP_SCHEDULE_FOR_CHECK` - specifies how often/when the post-backup check is performed, e.g. `cron(30 2 * * ? *)` runs daily at 2.30am; should typically be run some time after the backup phase is expected to complete

#### Retrieving existing values from AWS

If you're modifying an existing CDK application then you'll want to retrieve the values that are being used in production. You can use the aws cli to populate your .env with the production values:

```
echo "TRELLO_BACKUP_CARD_MODIFIED_SINCE=$(aws lambda list-functions | jq '.Functions | .[] | select(.FunctionName | test("TrelloBackupStack-backupBoard")) | .Environment | .Variables | .TRELLO_BACKUP_CARD_MODIFIED_SINCE')" >> .env
echo "TRELLO_BACKUP_OLDEST_ALLOWED_BACKUP_IN_SECONDS=$(aws lambda list-functions | jq '.Functions | .[] | select(.FunctionName | test("TrelloBackupStack-checkBoardBackups")) | .Environment | .Variables | .TRELLO_BACKUP_OLDEST_ALLOWED_BACKUP_IN_SECONDS')" >> .env
echo "HEALTHCHECKS_ENDPOINT_URL=$(aws lambda list-functions | jq '.Functions | .[] | select(.FunctionName | test("TrelloBackupStack-checkBoardBackups")) | .Environment | .Variables | .HEALTHCHECKS_ENDPOINT_URL')" >> .env
echo "TRELLO_BACKUP_MONITORING_EMAIL_ADDRESS=$(aws sns list-subscriptions | jq '.Subscriptions | .[] | select(.SubscriptionArn | test("TrelloBackupStack-monitoringTopic")) | .Endpoint')" >> .env
echo "TRELLO_BACKUP_SCHEDULE_FOR_BACKUP=$(aws events list-rules | jq '.Rules | .[] | select(.Name | test("TrelloBackupStack-RuleForBackup")) | .ScheduleExpression')" >> .env
echo "TRELLO_BACKUP_SCHEDULE_FOR_CHECK=$(aws events list-rules | jq '.Rules | .[] | select(.Name | test("TrelloBackupStack-RuleForCheck")) | .ScheduleExpression')" >> .env
```

## Build

    npm run build

## Compare the local version to production

    npx cdk diff

## Deploy the application

    npx cdk deploy

## Execute CDK commands

    cdk --profile <aws-profile-name> <cdk-command>

* See [Command-line Toolkit][2] for a list of commands and options to use with
the `cdk` command-line tool.

* The `cdk.json` file defines an appropriate value for the `--app` option, so
there is no need to specify this unless you want to override that value.

* When a stack uses assets (e.g. via a call to `aws-lambda.Code.asset()`),
before using the `cdk` command-line tool to deploy to an AWS environment for
the first time, the environment must be bootstrapped using: `cdk bootstrap`.

[Trello]: https://trello.com
[1]: https://awslabs.github.io/aws-cdk/getting-started.html#configuring-the-cdk-toolkit
[2]: https://awslabs.github.io/aws-cdk/tools.html#command-line-toolkit-cdk
[3]: https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html
