require 'addressable/uri'
require 'aws-sdk-sns'
require 'dotenv'
require 'restclient'

Dotenv.load

TOPIC_ARN = ENV.fetch('BACKUP_TRELLO_BOARD_TOPIC_ARN')

def handler(event:, context:)
  sns = Aws::SNS::Client.new

  endpoint = "https://api.trello.com/1/members/me/boards"
  uri = Addressable::URI.parse(endpoint)
  uri.query_values = {
    :key => ENV.fetch('TRELLO_KEY'),
    :token => ENV.fetch('TRELLO_TOKEN')
  }
  response = RestClient.get(uri.to_s)
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
