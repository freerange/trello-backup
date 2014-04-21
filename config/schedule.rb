env :PATH, '/usr/local/bin:/usr/bin:/bin'
env :MAILTO, 'everyone@gofreerange.com'

every :day, at: '2am' do
  command 'cd ~/app && ruby backup.rb'
end
