#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { TrelloBackupStack } from '../lib/trello-backup-stack';

const app = new cdk.App();
new TrelloBackupStack(app, 'TrelloBackupStack');
