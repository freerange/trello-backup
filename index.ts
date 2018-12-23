import cdk = require('@aws-cdk/cdk');
import lambda = require('@aws-cdk/aws-lambda');
import events = require('@aws-cdk/aws-events');
import s3 = require('@aws-cdk/aws-s3');
import { Topic } from '@aws-cdk/aws-sns';

class TrelloBackupStack extends cdk.Stack {
  constructor(parent: cdk.App, id: string, props?: cdk.StackProps) {
    super(parent, id, props);

    const backupTrelloBoardTopic = new Topic(this, 'backupTrelloBoardTopic');

    const enumerateTrelloBoardsFunction = new lambda.Function(this, 'enumerateTrelloBoards', {
      runtime: new lambda.Runtime('ruby2.5'),
      handler: 'index.handler',
      code: lambda.Code.asset('./lambdaFunctions/enumerateTrelloBoards'),
      environment: {
        BACKUP_TRELLO_BOARD_TOPIC_ARN: backupTrelloBoardTopic.topicArn
      },
      timeout: 30
    });

    const trelloBoardBackupsBucket = new s3.Bucket(this, 'trelloBoardBackupsBucket', {
      bucketName: 'trello-board-backups.gofreerange.com',
      versioned: true
    });

    const backupTrelloBoardFunction = new lambda.Function(this, 'backupTrelloBoard', {
      runtime: new lambda.Runtime('ruby2.5'),
      handler: 'index.handler',
      code: lambda.Code.asset('./lambdaFunctions/backupTrelloBoard'),
      environment: {
        BACKUP_TRELLO_BOARD_S3_BUCKET_NAME: trelloBoardBackupsBucket.bucketName
      },
      timeout: 30
    });

    trelloBoardBackupsBucket.grantPut(backupTrelloBoardFunction.role);

    backupTrelloBoardTopic.grantPublish(enumerateTrelloBoardsFunction.role);
    backupTrelloBoardTopic.subscribeLambda(backupTrelloBoardFunction);

    const dailyAt2am = 'cron(0 2 * * ? *)';
    const dailyAt2amRule = new events.EventRule(this, 'DailyAt2amRule', {
       scheduleExpression: dailyAt2am,
    });
    dailyAt2amRule.addTarget(enumerateTrelloBoardsFunction);
  }
}

const app = new cdk.App();
new TrelloBackupStack(app, 'TrelloBackup');
app.run();
