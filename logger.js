const { CloudWatchLogs } = require("@aws-sdk/client-cloudwatch-logs");
const {
  CloudWatchClient,
  PutMetricDataCommand,
} = require("@aws-sdk/client-cloudwatch");

const winston = require("winston");
require("winston-cloudwatch");
const region = process.env.AWS_REGION;

// Setup Winston to log to CloudWatch
const logger = winston.createLogger({
  level: "info",
  transports: [
    new winston.transports.Console(),
    new winston.transports.CloudWatch({
      logGroupName: "webappLogs",
      logStreamName: "webappStream",
      cloudWatchLogs: new CloudWatchLogs({
        region: region,
      }),
    }),
  ],
});

logger.logError = (method, endpoint, message) => {
  const structuredLog = {
    timestamp: new Date().toISOString(),
    level: "error",
    method: method,
    endpoint: endpoint,
    message: message,
  };

  logger.error(JSON.stringify(structuredLog));
};

logger.logInfo = (method, endpoint, message) => {
  const structuredLog = {
    timestamp: new Date().toISOString(),
    level: "info",
    method: method,
    endpoint: endpoint,
    message: message,
  };

  logger.info(JSON.stringify(structuredLog));
};

logger.logWarn = (method, endpoint, message) => {
  const structuredLog = {
    timestamp: new Date().toISOString(),
    level: "warn",
    method: method,
    endpoint: endpoint,
    message: message,
  };

  logger.warn(JSON.stringify(structuredLog));
};

//For metrics
const client = new CloudWatchClient({ region: region });

const sendMetric = async (metricName, value, endpoint, method, unit) => {
  const params = {
    MetricData: [
      {
        MetricName: metricName,
        Dimensions: [
          { Name: "Endpoint", Value: endpoint },
          { Name: "Method", Value: method },
        ],
        Unit: unit,
        Value: value,
      },
    ],
    Namespace: "WebAppMetrics",
  };
  console.log("The parameters are", params)
  await client.send(new PutMetricDataCommand(params));
};

module.exports = { logger, sendMetric };
