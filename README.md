## Requirements

* node
* npm

## Setup

### Install node packages

    npm ci

### Configure AWS

* You need to specify the AWS credentials and default region to use when running
the `cdk` command-line tool in the same way you would configure the `aws`
command-line tool. See [Configuring the AWS CDK Toolkit][1] for details.

* I recommend using `aws configure` and/or `~/.aws/credentials` & `~/.aws/config`
to setup a named profile and then use the `--profile <aws-profile-name>` option
with the `cdk` command-line tool to select the relevant AWS profile.

### Getting a Trello API key

Ensure you're logged in as the GFR Admin user.

    $ open "https://trello.com/1/appKey/generate"
    # Copy the Key (under Developer API Keys) to the clipboard

    # Temporarily store the Trello API key in an environment variable
    $ export TRELLO_KEY=`pbpaste`

    # Store the Trello API key in .env
    $ echo "TRELLO_KEY=$TRELLO_KEY" >> lambdaFunctions/enumerateTrelloBoards/.env
    $ echo "TRELLO_KEY=$TRELLO_KEY" >> lambdaFunctions/backupTrelloBoard/.env

### Getting a Trello API token

Ensure you're logged in as the GFR Admin user on https://trello.com. It's safe to run do this step multiple times as you'll get the same token back even if it's already been generated.

    $ open "https://trello.com/1/connect?key=$TRELLO_KEY&name=gfr-trello-backup&expiration=never&response_type=token"
    # Allow the gfr-trello-backup app to read our Trello account

    # Copy the token from the resulting page

    # Temporarily store the Trello token in an environment variable
    $ export TRELLO_TOKEN=`pbpaste`

    # Store the Trello token in .env
    $ echo "TRELLO_TOKEN=$TRELLO_TOKEN" >> .env
    $ echo "TRELLO_TOKEN=$TRELLO_TOKEN" >> .env

### Environment variables

In the top-level `.env` file, set the following environment variables:

* `TRELLO_BOARD_BACKUPS_SCHEDULE_EXPRESSION` - specifies how often the backup is performed, e.g. "cron(0 2 * * ? *)" runs daily at 2am (see [Schedule Expressions for Rules][3] for details)
* `TRELLO_BOARD_BACKUPS_S3_BUCKET_NAME` - the name of the S3 bucket you want to be created and used to save backups
* `TRELLO_BOARD_BACKUPS_ALARM_EMAIL_ADDRESS` - the email address where alarm emails will be sent (an email will be sent on deployment to ask you to confirm the subscription)

Note: this `.env` file is copied into some/all of the `lambdaFunctions` folders at build time.

## Build

    npm run build

## Execute CDK commands

    cdk --profile <aws-profile-name> <cdk-command>

* See [Command-line Toolkit][2] for a list of commands and options to use with
the `cdk` command-line tool.

* The `cdk.json` file defines an appropriate value for the `--app` option, so
there is no need to specify this unless you want to override that value.

* `node_modules/.bin` must be in your `PATH` environment variable in order to
be able to run the `cdk` command-line tool.

* When a stack uses assets (e.g. via a call to `aws-lambda.Code.asset()`),
before using the `cdk` command-line tool to deploy to an AWS environment for
the first time, the environment must be bootstrapped using: `cdk bootstrap`.

[1]: https://awslabs.github.io/aws-cdk/getting-started.html#configuring-the-cdk-toolkit
[2]: https://awslabs.github.io/aws-cdk/tools.html#command-line-toolkit-cdk
[3]: https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html
