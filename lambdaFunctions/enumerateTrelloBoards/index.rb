require 'aws-sdk-sns'
require 'dotenv'
require 'trello'

Dotenv.load

Trello.configure do |config|
  config.developer_public_key = ENV.fetch('TRELLO_KEY')
  config.member_token = ENV.fetch('TRELLO_TOKEN')
end

TOPIC_ARN = ENV.fetch('BACKUP_TRELLO_BOARD_TOPIC_ARN')

def handler(event:, context:)
  sns = Aws::SNS::Client.new
  boards = Trello::Board.all
  boards.each do |board|
    sns.publish(
      topic_arn: TOPIC_ARN,
      subject: "Backup Trello board",
      message: "Backup Trello board: #{board.name}",
      message_attributes: {
        'board_id' => {
          data_type: 'String',
          string_value: board.id
        },
        'board_name' => {
          data_type: 'String',
          string_value: board.name
        }
      }
    )
  end
  { statusCode: 200, body: 'OK' }
end
