require 'aws-sdk-s3'
require 'aws-sdk-secretsmanager'
require 'aws-sdk-sns'
require 'csv'
require 'net/http'
require 'uri'

TOPIC_ARN = ENV.fetch('TRELLO_BACKUP_MONITORING_TOPIC_ARN')
S3_BUCKET_NAME = ENV.fetch('TRELLO_BACKUP_S3_BUCKET_NAME')
OLDEST_ALLOWED_BACKUP_IN_SECONDS = Integer(ENV.fetch('TRELLO_BACKUP_OLDEST_ALLOWED_BACKUP_IN_SECONDS'))
HEALTHCHECKS_ENDPOINT_URL = ENV.fetch('HEALTHCHECKS_ENDPOINT_URL')

def handler(event:, context:)
  secrets_manager = Aws::SecretsManager::Client.new
  trello_key = secrets_manager.get_secret_value(secret_id: ENV.fetch('TRELLO_KEY_ARN')).secret_string
  trello_token = secrets_manager.get_secret_value(secret_id: ENV.fetch('TRELLO_TOKEN_ARN')).secret_string

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

  earliest_allowed_backup_time = Time.now - OLDEST_ALLOWED_BACKUP_IN_SECONDS
  boards_with_status = boards.map do |board|
    board_id = board['id']
    object_key = "#{board_id}.json"
    result = { id: board_id, name: board['name'] }
    begin
      object = Aws::S3::Object.new(S3_BUCKET_NAME, object_key)
      result[:message] = "Last backed up: #{object.data.last_modified}"
      if object.data.last_modified >= earliest_allowed_backup_time
        result.merge(success: true)
      else
        result.merge(success: false)
      end
    rescue Aws::S3::Errors::NotFound => e
      result.merge(success: false, message: e.inspect)
    end
  end

  if boards_with_status.all? { |b| b[:success] }
    Net::HTTP.get(URI.parse("#{HEALTHCHECKS_ENDPOINT_URL}"))
  else
    subject = "Trello Backup: Failure"
    message = ''
    CSV(message, col_sep: "\t") do |csv|
      csv << %w[id name success message]
      boards_with_status.each do |board|
        csv << [board[:id], board[:name], board[:success], board[:message]]
      end
    end

    sns = Aws::SNS::Client.new
    sns.publish(
      topic_arn: TOPIC_ARN,
      subject: subject,
      message: message,
    )

    Net::HTTP.get(URI.parse("#{HEALTHCHECKS_ENDPOINT_URL}/fail"))
  end

  { statusCode: 200, body: 'OK' }
end
