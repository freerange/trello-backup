We use this script to regularly backup all our GFR Trello boards to Dropbox.

## Generating/storing the tokens you need to use this script

### Getting the Trello API key

Ensure you're logged in as the GFR Admin user.

    $ open "https://trello.com/1/appKey/generate"
    # Copy the Key (under Developer API Keys) to the clipboard

    # Temporarily store the Trello API key in an environment variable
    $ export TRELLO_KEY=`pbpaste`

    # Store the Trello API key in .env
    $ echo "TRELLO_KEY=$TRELLO_KEY" >> .env

### Getting a token to allow this app to read our Trello board

Ensure you're logged in as the GFR Admin user. It's safe to run do this step multiple times as you'll get the same token back even if it's already been generated.

    $ open "https://trello.com/1/connect?key=$TRELLO_KEY&name=gfr-trello-backup&expiration=never&response_type=token"
    # Allow the gfr-trello-backup app to read our Trello account

    # Copy the token from the resulting page

    # Temporarily store the Trello token in an environment variable
    $ export TRELLO_TOKEN=`pbpaste`

    # Store the Trello token in .env
    $ echo "TRELLO_TOKEN=$TRELLO_TOKEN" >> .env

### Getting a token to allow this app to write to Dropbox

    $ open "https://www.dropbox.com/developers/apps"

    # Navigate to "Trello Backup"
    # Click the "Generate" button in OAuth 2 > Generated access token
    # Copy the generated access token

    # Temporarily store the access token in an environment variable
    $ export DROPBOX_ACCESS_TOKEN=`pbpaste`

    # Store the Dropbox token in .env
    $ echo "DROPBOX_ACCESS_TOKEN=$DROPBOX_ACCESS_TOKEN" >> .env

## Testing the script locally

Assuming you've followed the instructions above and got all the tokens stored in .env, this should be as simple as running `ruby backup.rb`. If it's worked successfully then you'll see a backup for today in https://www.dropbox.com/home/Apps/Trello%20Backup.

## Deployment

### Deploying with recap

    $ cap bootstrap
    $ cap deploy:setup
    $ cap deploy

### Set the application user's shell to bash

    root$ chsh -s /bin/bash trello_backup

### Set the Trello and Dropbox environment variables

I'm going to assume you've already got these environment variables configured in your local .env.

    $ cap env:set TRELLO_KEY=`grep TRELLO_KEY .env | cut -d"=" -f2`
    $ cap env:set TRELLO_TOKEN=`grep TRELLO_TOKEN .env | cut -d"=" -f2`
    $ cap env:set DROPBOX_ACCESS_TOKEN=`grep DROPBOX_ACCESS_TOKEN .env | cut -d"=" -f2`

## Test the script by running it manually

    # Print the command that's being run under cron
    trello_backup$ crontab -l | grep -o "/bin/bash.*backup.rb.*"

    # Copy and paste the printed command to execute the backup script manually
    # If everything has worked then you should see a new backup file in
    # https://www.dropbox.com/home/Apps/Trello%20Backup when you're logged
    # in as GFR's dropbox user.

