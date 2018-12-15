import cdk = require('@aws-cdk/cdk');

class TrelloBackupStack extends cdk.Stack {
  constructor(parent: cdk.App, id: string, props?: cdk.StackProps) {
    super(parent, id, props);
  }
}

const app = new cdk.App();
new TrelloBackupStack(app, 'TrelloBackup');
app.run();
