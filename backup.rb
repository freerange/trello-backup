require 'logger'
logger = Logger.new(STDOUT)
logger.formatter = Logger::Formatter.new

STDOUT.sync = true

logger.info 'Loading environment...'

require 'rubygems'
require 'bundler/setup'

require 'dotenv'
require 'addressable/uri'
require 'restclient'
require 'dropbox_sdk'
require 'date'
require 'trello'

Dotenv.load

logger.info 'OK'

Trello.configure do |config|
  config.developer_public_key = ENV.fetch('TRELLO_KEY')
  config.member_token = ENV.fetch('TRELLO_TOKEN')
end

boards = Trello::Board.all.reject { |b| b.name[/Welcome Board/] }
boards.each do |board|
  endpoint = "https://api.trello.com/1/boards/#{board.id}"
  uri = Addressable::URI.parse(endpoint)
  uri.query_values = {
    :actions => :all,
    :actions_limit => 1000,
    :cards => :all,
    :lists => :all,
    :members => :all,
    :member_fields => :all,
    :checklists => :all,
    :fields => :all,
    :card_attachments => true,
    :key => ENV.fetch('TRELLO_KEY'),
    :token => ENV.fetch('TRELLO_TOKEN')
  }

  logger.info 'Fetching Trello data for board...'
  response = RestClient.get(uri.to_s)
  json = response.body
  logger.info 'OK'

  logger.info 'Writing data to Dropbox...'
  client = DropboxClient.new(ENV['DROPBOX_ACCESS_TOKEN'])
  filename = "/#{Date.today}-#{board.name.downcase.gsub(/ /, '-')}-trello.json"
  client.put_file(filename, json)
  logger.info 'OK'
end
