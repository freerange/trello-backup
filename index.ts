import cdk = require('@aws-cdk/cdk');
import lambda = require('@aws-cdk/aws-lambda');
import events = require('@aws-cdk/aws-events');
import s3 = require('@aws-cdk/aws-s3');
import { Topic } from '@aws-cdk/aws-sns';
import dotenv = require('dotenv');

dotenv.config();

class TrelloBackupStack extends cdk.Stack {
  constructor(parent: cdk.App, id: string, props?: cdk.StackProps) {
    super(parent, id, props);

    const backupTrelloBoardTopic = new Topic(this, 'backupTrelloBoardTopic');

    const enumerateTrelloBoardsFunction
      = this.createEnumerateTrelloBoardsFunction(backupTrelloBoardTopic);

    const trelloBoardBackupsBucket
      = this.createTrelloBoardBackupsBucket();

    const backupTrelloBoardFunction
      = this.createBackupTrelloBoardFunction(trelloBoardBackupsBucket);

    backupTrelloBoardTopic.subscribeLambda(backupTrelloBoardFunction);

    this.scheduleDailyAt2am(enumerateTrelloBoardsFunction);
  }

  createEnumerateTrelloBoardsFunction(backupTrelloBoardTopic : Topic) : lambda.Function {
    const lambdaFunction = new lambda.Function(this, 'enumerateTrelloBoards', {
      runtime: new lambda.Runtime('ruby2.5'),
      handler: 'index.handler',
      code: lambda.Code.asset('./lambdaFunctions/enumerateTrelloBoards'),
      environment: {
        BACKUP_TRELLO_BOARD_TOPIC_ARN: backupTrelloBoardTopic.topicArn
      },
      timeout: 30
    });
    backupTrelloBoardTopic.grantPublish(lambdaFunction.role);
    return lambdaFunction;
  }

  createTrelloBoardBackupsBucket() : s3.Bucket {
    return new s3.Bucket(this, 'trelloBoardBackupsBucket', {
      bucketName: process.env.TRELLO_BOARD_BACKUPS_BUCKET_NAME,
      versioned: true
    });
  }

  createBackupTrelloBoardFunction(trelloBoardBackupsBucket : s3.Bucket) : lambda.Function {
    const lambdaFunction = new lambda.Function(this, 'backupTrelloBoard', {
      runtime: new lambda.Runtime('ruby2.5'),
      handler: 'index.handler',
      code: lambda.Code.asset('./lambdaFunctions/backupTrelloBoard'),
      environment: {
        BACKUP_TRELLO_BOARD_S3_BUCKET_NAME: trelloBoardBackupsBucket.bucketName
      },
      timeout: 30
    });
    trelloBoardBackupsBucket.grantPut(lambdaFunction.role);
    return lambdaFunction;
  }

  scheduleDailyAt2am(lambdaFunction : lambda.Function) : void {
    const dailyAt2am = 'cron(0 2 * * ? *)';
    const dailyAt2amRule = new events.EventRule(this, 'DailyAt2amRule', {
       scheduleExpression: dailyAt2am,
    });
    dailyAt2amRule.addTarget(lambdaFunction);
  }
}

const app = new cdk.App();
new TrelloBackupStack(app, 'TrelloBackup');
app.run();
