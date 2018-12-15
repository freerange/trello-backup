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
