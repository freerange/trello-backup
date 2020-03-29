import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as events from '@aws-cdk/aws-events';
import * as s3 from '@aws-cdk/aws-s3';
import { Topic } from '@aws-cdk/aws-sns';
import * as aet from '@aws-cdk/aws-events-targets';
import * as aca from '@aws-cdk/aws-cloudwatch-actions';
import * as ass from '@aws-cdk/aws-sns-subscriptions';
import * as dotenv from 'dotenv';

dotenv.config();

const env = (key: string) => {
  const value = process.env[key];
  if (value) {
    return value;
  } else {
    throw `Missing env var ${key}`
  }
}
const rubyLambdaRuntime = new lambda.Runtime('ruby2.5');
const lambdaFunctionTimeout = 120;

export class TrelloBackupStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const monitoringTopic = new Topic(this, 'monitoringTopic');
    const backupBoardTopic = new Topic(this, 'backupBoardTopic');

    const enumerateBoardsFunction
      = this.createEnumerateBoardsFunction(backupBoardTopic, monitoringTopic);

    const boardBackupsBucket = new s3.Bucket(this, 'boardBackupsBucket', {
      versioned: true
    });

    const backupBoardFunction
      = this.createBackupBoardFunction(boardBackupsBucket, monitoringTopic);

    backupBoardTopic.addSubscription(new ass.LambdaSubscription(backupBoardFunction));

    const checkBoardBackupsFunction
      = this.createCheckBoardBackupsFunction(boardBackupsBucket, monitoringTopic);

    const monitoringEmailAddress = env('TRELLO_BACKUP_MONITORING_EMAIL_ADDRESS');
    monitoringTopic.addSubscription(new ass.EmailSubscription(monitoringEmailAddress));

    const scheduleForBackup = env('TRELLO_BACKUP_SCHEDULE_FOR_BACKUP');
    const ruleForBackup = new events.Rule(this, 'RuleForBackup', {
      schedule: events.Schedule.expression(scheduleForBackup)
    });
    ruleForBackup.addTarget(new aet.LambdaFunction(enumerateBoardsFunction));

    const scheduleForCheck = env('TRELLO_BACKUP_SCHEDULE_FOR_CHECK');
    const ruleForCheck = new events.Rule(this, 'RuleForCheck', {
      schedule: events.Schedule.expression(scheduleForCheck)
    });
    ruleForCheck.addTarget(new aet.LambdaFunction(checkBoardBackupsFunction));
  }

  createEnumerateBoardsFunction(backupBoardTopic : Topic, monitoringTopic : Topic) : lambda.Function {
    const lambdaFunction = new lambda.Function(this, 'enumerateBoards', {
      runtime: rubyLambdaRuntime,
      handler: 'index.handler',
      code: lambda.Code.asset('./lambdaFunctions/enumerateBoards'),
      environment: {
        TRELLO_BACKUP_BACKUP_BOARD_TOPIC_ARN: backupBoardTopic.topicArn
      },
      timeout: cdk.Duration.seconds(lambdaFunctionTimeout)
    });
    backupBoardTopic.grantPublish(lambdaFunction);
    this.reportErrors(lambdaFunction, monitoringTopic);
    return lambdaFunction;
  }

  createBackupBoardFunction(boardBackupsBucket : s3.Bucket, monitoringTopic : Topic) : lambda.Function {
    const lambdaFunction = new lambda.Function(this, 'backupBoard', {
      runtime: rubyLambdaRuntime,
      handler: 'index.handler',
      code: lambda.Code.asset('./lambdaFunctions/backupBoard'),
      environment: {
        TRELLO_BACKUP_S3_BUCKET_NAME: boardBackupsBucket.bucketName
      },
      timeout: cdk.Duration.seconds(lambdaFunctionTimeout)
    });
    boardBackupsBucket.grantPut(lambdaFunction);
    this.reportErrors(lambdaFunction, monitoringTopic);
    return lambdaFunction;
  }

  createCheckBoardBackupsFunction(boardBackupsBucket : s3.Bucket, monitoringTopic : Topic) : lambda.Function {
    const lambdaFunction = new lambda.Function(this, 'checkBoardBackups', {
      runtime: rubyLambdaRuntime,
      handler: 'index.handler',
      code: lambda.Code.asset('./lambdaFunctions/checkBoardBackups'),
      environment: {
        TRELLO_BACKUP_S3_BUCKET_NAME: boardBackupsBucket.bucketName,
        TRELLO_BACKUP_MONITORING_TOPIC_ARN: monitoringTopic.topicArn,
        TRELLO_BACKUP_OLDEST_ALLOWED_BACKUP_IN_SECONDS: env('TRELLO_BACKUP_OLDEST_ALLOWED_BACKUP_IN_SECONDS')
      },
      timeout: cdk.Duration.seconds(lambdaFunctionTimeout)
    });
    boardBackupsBucket.grantRead(lambdaFunction);
    monitoringTopic.grantPublish(lambdaFunction);
    this.reportErrors(lambdaFunction, monitoringTopic);
    return lambdaFunction;
  }

  reportErrors(lambdaFunction : lambda.Function, monitoringTopic : Topic) : void {
    const metricErrors = lambdaFunction.metricErrors();
    const alarm = metricErrors.createAlarm(this, `${lambdaFunction.node.id}Alarm`, {
      threshold: 1,
      evaluationPeriods: 1
    });
    alarm.addAlarmAction(new aca.SnsAction(monitoringTopic));
  }
}
