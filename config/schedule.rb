env :PATH, '/usr/local/bin:/usr/bin:/bin'
env :MAILTO, 'everyone@gofreerange.com'

every :day, :at => '2am' do
  command 'cd ~/app && ruby backup.rb >> trello_backup.log 2>&1 || echo "Trello Backup: error occurred. See trello_backup.log for details."'
end
