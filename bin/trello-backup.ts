#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { TrelloBackupStack } from "../lib/trello-backup-stack";

const app = new cdk.App();
new TrelloBackupStack(app, "TrelloBackupStack");
