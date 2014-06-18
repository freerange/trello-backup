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

Dotenv.load

logger.info 'OK'

endpoint = "https://api.trello.com/1/boards/#{ENV['TRELLO_BOARD_ID']}"
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
  :key => ENV['TRELLO_KEY'],
  :token => ENV['TRELLO_TOKEN']
}

logger.info 'Fetching Trello data for board...'
response = RestClient.get(uri.to_s)
json = response.body
logger.info 'OK'

logger.info 'Writing data to Dropbox...'
client = DropboxClient.new(ENV['DROPBOX_ACCESS_TOKEN'])
client.put_file("/#{Date.today}-trello.json", json)
logger.info 'OK'
