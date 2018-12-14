import cdk = require('@aws-cdk/cdk');

class TrelloBackupStack extends cdk.Stack {
}

const app = new cdk.App();
new TrelloBackupStack(app, 'TrelloBackup');
app.run();
