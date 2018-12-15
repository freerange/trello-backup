require 'addressable/uri'
require 'aws-sdk-s3'
require 'dotenv'
require 'restclient'

Dotenv.load

S3_BUCKET_NAME = ENV.fetch('BACKUP_TRELLO_BOARD_S3_BUCKET_NAME')

def handler(event:, context:)
  records = event.fetch('Records', [])
  sns_events = records.select { |r| r['EventSource'] == 'aws:sns' }
  sns_events.each do |sns_event|
    attributes = sns_event.dig('Sns', 'MessageAttributes')
    board_id = attributes.dig('board_id', 'Value')
    board_name = attributes.dig('board_name', 'Value')

    endpoint = "https://api.trello.com/1/boards/#{board_id}"
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

    puts "#{board_id} - Fetching Trello data for #{board_name} board..."
    response = RestClient.get(uri.to_s)
    json = response.body
    puts "#{board_id} - OK"

    puts "#{board_id} - Writing data for #{board_name} board to S3..."
    object = Aws::S3::Object.new(S3_BUCKET_NAME, "#{board_id}.json")
    object.upload_stream(content_type: 'application/json') { |stream| stream << json }
    puts "#{board_id} - OK"
  end

  { statusCode: 200, body: 'OK' }
end
