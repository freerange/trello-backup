require 'dotenv'

Dotenv.load

def handler(event:, context:)
  { statusCode: 200, body: 'OK' }
end
