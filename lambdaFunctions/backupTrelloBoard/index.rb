require 'dotenv'

Dotenv.load

def handler(event:, context:)
  p event
  p ENV.fetch('TRELLO_KEY')
  p ENV.fetch('TRELLO_TOKEN')
  { statusCode: 200, body: 'OK' }
end
