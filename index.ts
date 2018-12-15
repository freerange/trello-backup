import cdk = require('@aws-cdk/cdk');
import events = require('@aws-cdk/aws-events');

class TrelloBackupStack extends cdk.Stack {
  constructor(parent: cdk.App, id: string, props?: cdk.StackProps) {
    super(parent, id, props);

    const dailyAt2am = 'cron(0 2 * * ? *)';
    const dailyAt2amRule = new events.EventRule(this, 'DailyAt2amRule', {
       scheduleExpression: dailyAt2am,
    });
  }
}

const app = new cdk.App();
new TrelloBackupStack(app, 'TrelloBackup');
app.run();
