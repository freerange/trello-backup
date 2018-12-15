require 'dotenv'
require 'trello'

Dotenv.load

Trello.configure do |config|
  config.developer_public_key = ENV.fetch('TRELLO_KEY')
  config.member_token = ENV.fetch('TRELLO_TOKEN')
end

def handler(event:, context:)
  p Trello::Board.all.first.name
  { statusCode: 200, body: 'OK' }
end
