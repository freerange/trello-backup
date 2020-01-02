require 'aws-sdk-s3'
require 'aws-sdk-sns'
require 'csv'
require 'dotenv'
require 'net/http'
require 'uri'

Dotenv.load

TOPIC_ARN = ENV.fetch('TRELLO_BACKUP_MONITORING_TOPIC_ARN')
S3_BUCKET_NAME = ENV.fetch('TRELLO_BACKUP_S3_BUCKET_NAME')
OLDEST_ALLOWED_BACKUP_IN_SECONDS = Integer(ENV.fetch('TRELLO_BACKUP_OLDEST_ALLOWED_BACKUP_IN_SECONDS'))

def handler(event:, context:)
  endpoint = "https://api.trello.com/1/members/me/boards"
  uri = URI(endpoint)
  uri.query = URI.encode_www_form({
    :key => ENV.fetch('TRELLO_KEY'),
    :token => ENV.fetch('TRELLO_TOKEN'),
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

  unless boards_with_status.all? { |b| b[:success] }
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
  end

  # Ping healthchecks.io
  Net::HTTP.get(URI.parse('https://hc-ping.com/60c927ed-9af3-419b-9f4e-6db6369e7d28'))

  { statusCode: 200, body: 'OK' }
end
