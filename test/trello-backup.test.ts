import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import TrelloBackup = require('../lib/trello-backup-stack');

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new TrelloBackup.TrelloBackupStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
