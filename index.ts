import cdk = require('@aws-cdk/cdk');
import lambda = require('@aws-cdk/aws-lambda');
import events = require('@aws-cdk/aws-events');
import { Topic } from '@aws-cdk/aws-sns';

class TrelloBackupStack extends cdk.Stack {
  constructor(parent: cdk.App, id: string, props?: cdk.StackProps) {
    super(parent, id, props);

    const backupTrelloBoardTopic = new Topic(this, 'backupTrelloBoardTopic');

    const enumerateTrelloBoards = new lambda.Function(this, 'enumerateTrelloBoards', {
      runtime: new lambda.Runtime('ruby2.5'),
      handler: 'index.handler',
      code: lambda.Code.asset('./lambdaFunctions/enumerateTrelloBoards'),
      environment: {
        BACKUP_TRELLO_BOARD_TOPIC_ARN: backupTrelloBoardTopic.topicArn
      },
      timeout: 30
    });

    const backupTrelloBoard = new lambda.Function(this, 'backupTrelloBoard', {
      runtime: new lambda.Runtime('ruby2.5'),
      handler: 'index.handler',
      code: lambda.Code.asset('./lambdaFunctions/backupTrelloBoard'),
      timeout: 30
    });

    backupTrelloBoardTopic.grantPublish(enumerateTrelloBoards.role);
    backupTrelloBoardTopic.subscribeLambda(backupTrelloBoard);

    const dailyAt2am = 'cron(0 2 * * ? *)';
    const dailyAt2amRule = new events.EventRule(this, 'DailyAt2amRule', {
       scheduleExpression: dailyAt2am,
    });
    dailyAt2amRule.addTarget(enumerateTrelloBoards);
  }
}

const app = new cdk.App();
new TrelloBackupStack(app, 'TrelloBackup');
app.run();
