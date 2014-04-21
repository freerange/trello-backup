require 'recap/recipes/ruby'

set :application, 'trello_backup'
set :repository, 'https://github.com/freerange/trello_backup'

server 'gofreerange.com', :app

set :whenever_command, 'bundle exec whenever'
set(:whenever_identifier)   { application }
set(:whenever_update_flags) { "--update-crontab #{whenever_identifier} -u #{application_user}" }
set(:whenever_clear_flags)  { "--clear-crontab #{whenever_identifier} -u #{application_user}" }

before "deploy:update_code", "whenever:clear_crontab"
after "deploy:tag", "whenever:update_crontab"
after "deploy:rollback", "whenever:update_crontab"

namespace :whenever do
  desc "Update application's crontab entries using Whenever"
  task :update_crontab, :roles => :app do
    as_app "#{whenever_command} #{whenever_update_flags}"
  end

  desc "Clear application's crontab entries using Whenever"
  task :clear_crontab, :roles => :app do
    as_app "#{whenever_command} #{whenever_clear_flags}"
  end
end
