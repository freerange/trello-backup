require 'dotenv'

Dotenv.load

p ENV.fetch('TRELLO_KEY')
p ENV.fetch('TRELLO_TOKEN')

def handler(event:, context:)
  { statusCode: 200, body: 'OK' }
end
