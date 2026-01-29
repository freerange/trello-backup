require 'aws-sdk-sns'
require 'aws-sdk-secretsmanager'
require 'dotenv'

Dotenv.load

TOPIC_ARN = ENV.fetch('TRELLO_BACKUP_BACKUP_BOARD_TOPIC_ARN')

def handler(event:, context:)
  secrets_manager = Aws::SecretsManager::Client.new
  trello_key = secrets_manager.get_secret_value(secret_id: ENV.fetch('TRELLO_KEY_ARN')).secret_string
  trello_token = secrets_manager.get_secret_value(secret_id: ENV.fetch('TRELLO_TOKEN_ARN')).secret_string

  sns = Aws::SNS::Client.new

  endpoint = "https://api.trello.com/1/members/me/boards"
  uri = URI(endpoint)
  uri.query = URI.encode_www_form({
    :key => trello_key,
    :token => trello_token,
    :fields => 'id,name'
  })
  response = Net::HTTP.get_response(uri)
  unless response.is_a?(Net::HTTPSuccess)
    raise "Trello API error: #{response.message} #{response.code}"
  end
  boards = JSON.parse(response.body)

  boards.each do |board|
    board_id = board['id']
    board_name = board['name']
    sns.publish(
      topic_arn: TOPIC_ARN,
      subject: "Backup Trello board",
      message: "Backup Trello board: #{board_name}",
      message_attributes: {
        'board_id' => {
          data_type: 'String',
          string_value: board_id
        },
        'board_name' => {
          data_type: 'String',
          string_value: board_name
        }
      }
    )
  end
  { statusCode: 200, body: 'OK' }
end
