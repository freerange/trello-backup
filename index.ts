import cdk = require('@aws-cdk/cdk');
import lambda = require('@aws-cdk/aws-lambda');
import events = require('@aws-cdk/aws-events');
import s3 = require('@aws-cdk/aws-s3');
import { Topic } from '@aws-cdk/aws-sns';
import dotenv = require('dotenv');

dotenv.config();

const rubyLambdaRuntime = new lambda.Runtime('ruby2.5');
const lambdaFunctionTimeout = 30;

class TrelloBackupStack extends cdk.Stack {
  constructor(parent: cdk.App, id: string, props?: cdk.StackProps) {
    super(parent, id, props);

    const alarmTopic = new Topic(this, 'alarmTopic');
    const backupTrelloBoardTopic = new Topic(this, 'backupTrelloBoardTopic');

    const enumerateTrelloBoardsFunction
      = this.createEnumerateTrelloBoardsFunction(backupTrelloBoardTopic, alarmTopic);

    const bucketName = process.env.TRELLO_BOARD_BACKUPS_BUCKET_NAME;
    const trelloBoardBackupsBucket
      = this.createTrelloBoardBackupsBucket(bucketName);

    const backupTrelloBoardFunction
      = this.createBackupTrelloBoardFunction(trelloBoardBackupsBucket, alarmTopic);

    backupTrelloBoardTopic.subscribeLambda(backupTrelloBoardFunction);

    const alarmEmailAddress = process.env.TRELLO_BOARD_BACKUPS_ALARM_EMAIL_ADDRESS;
    alarmTopic.subscribeEmail('alarmTopicEmail', alarmEmailAddress);

    const scheduleExpression = process.env.TRELLO_BOARD_BACKUPS_SCHEDULE_EXPRESSION;
    this.schedule(enumerateTrelloBoardsFunction, scheduleExpression);
  }

  createEnumerateTrelloBoardsFunction(backupTrelloBoardTopic : Topic, alarmTopic : Topic) : lambda.Function {
    const lambdaFunction = new lambda.Function(this, 'enumerateTrelloBoards', {
      runtime: rubyLambdaRuntime,
      handler: 'index.handler',
      code: lambda.Code.asset('./lambdaFunctions/enumerateTrelloBoards'),
      environment: {
        BACKUP_TRELLO_BOARD_TOPIC_ARN: backupTrelloBoardTopic.topicArn
      },
      timeout: lambdaFunctionTimeout
    });
    backupTrelloBoardTopic.grantPublish(lambdaFunction.role);
    this.reportErrors(lambdaFunction, alarmTopic);
    return lambdaFunction;
  }

  createTrelloBoardBackupsBucket(bucketName : string) : s3.Bucket {
    return new s3.Bucket(this, 'trelloBoardBackupsBucket', {
      bucketName: bucketName,
      versioned: true
    });
  }

  createBackupTrelloBoardFunction(trelloBoardBackupsBucket : s3.Bucket, alarmTopic : Topic) : lambda.Function {
    const lambdaFunction = new lambda.Function(this, 'backupTrelloBoard', {
      runtime: rubyLambdaRuntime,
      handler: 'index.handler',
      code: lambda.Code.asset('./lambdaFunctions/backupTrelloBoard'),
      environment: {
        BACKUP_TRELLO_BOARD_S3_BUCKET_NAME: trelloBoardBackupsBucket.bucketName
      },
      timeout: lambdaFunctionTimeout
    });
    trelloBoardBackupsBucket.grantPut(lambdaFunction.role);
    this.reportErrors(lambdaFunction, alarmTopic);
    return lambdaFunction;
  }

  schedule(lambdaFunction : lambda.Function, scheduleExpression : string) : void {
    const rule = new events.EventRule(this, 'ScheduleExpressionRule', {
       scheduleExpression: scheduleExpression,
    });
    rule.addTarget(lambdaFunction);
  }

  reportErrors(lambdaFunction : lambda.Function, alarmTopic : Topic) : void {
    const metricErrors = lambdaFunction.metricErrors();
    const alarm = metricErrors.newAlarm(this, `${lambdaFunction.id}Alarm`, {
      threshold: 1,
      evaluationPeriods: 1
    });
    alarm.onAlarm(alarmTopic);
  }
}

const app = new cdk.App();
new TrelloBackupStack(app, 'TrelloBackup');
app.run();
