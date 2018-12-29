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

    const monitoringTopic = new Topic(this, 'monitoringTopic');
    const backupBoardTopic = new Topic(this, 'backupBoardTopic');

    const enumerateBoardsFunction
      = this.createEnumerateBoardsFunction(backupBoardTopic, monitoringTopic);

    const bucketName = process.env.TRELLO_BOARD_BACKUPS_S3_BUCKET_NAME;
    const trelloBoardBackupsBucket
      = this.createTrelloBoardBackupsBucket(bucketName);

    const backupBoardFunction
      = this.createBackupBoardFunction(trelloBoardBackupsBucket, monitoringTopic);

    backupBoardTopic.subscribeLambda(backupBoardFunction);

    const monitoringEmailAddress = process.env.TRELLO_BOARD_BACKUPS_MONITORING_EMAIL_ADDRESS;
    monitoringTopic.subscribeEmail('monitoringTopicEmail', monitoringEmailAddress);

    const scheduleExpression = process.env.TRELLO_BOARD_BACKUPS_SCHEDULE_EXPRESSION;
    this.schedule(enumerateBoardsFunction, scheduleExpression);
  }

  createEnumerateBoardsFunction(backupBoardTopic : Topic, monitoringTopic : Topic) : lambda.Function {
    const lambdaFunction = new lambda.Function(this, 'enumerateBoards', {
      runtime: rubyLambdaRuntime,
      handler: 'index.handler',
      code: lambda.Code.asset('./lambdaFunctions/enumerateBoards'),
      environment: {
        BACKUP_TRELLO_BOARD_TOPIC_ARN: backupBoardTopic.topicArn
      },
      timeout: lambdaFunctionTimeout
    });
    backupBoardTopic.grantPublish(lambdaFunction.role);
    this.reportErrors(lambdaFunction, monitoringTopic);
    return lambdaFunction;
  }

  createTrelloBoardBackupsBucket(bucketName : string) : s3.Bucket {
    return new s3.Bucket(this, 'trelloBoardBackupsBucket', {
      bucketName: bucketName,
      versioned: true
    });
  }

  createBackupBoardFunction(trelloBoardBackupsBucket : s3.Bucket, monitoringTopic : Topic) : lambda.Function {
    const lambdaFunction = new lambda.Function(this, 'backupBoard', {
      runtime: rubyLambdaRuntime,
      handler: 'index.handler',
      code: lambda.Code.asset('./lambdaFunctions/backupBoard'),
      timeout: lambdaFunctionTimeout
    });
    trelloBoardBackupsBucket.grantPut(lambdaFunction.role);
    this.reportErrors(lambdaFunction, monitoringTopic);
    return lambdaFunction;
  }

  schedule(lambdaFunction : lambda.Function, scheduleExpression : string) : void {
    const rule = new events.EventRule(this, 'ScheduleExpressionRule', {
       scheduleExpression: scheduleExpression,
    });
    rule.addTarget(lambdaFunction);
  }

  reportErrors(lambdaFunction : lambda.Function, monitoringTopic : Topic) : void {
    const metricErrors = lambdaFunction.metricErrors();
    const alarm = metricErrors.newAlarm(this, `${lambdaFunction.id}Alarm`, {
      threshold: 1,
      evaluationPeriods: 1
    });
    alarm.onAlarm(monitoringTopic);
  }
}

const app = new cdk.App();
new TrelloBackupStack(app, 'TrelloBackup');
app.run();
