const { CloudWatchLogs } = require("@aws-sdk/client-cloudwatch-logs");
const {
  CloudWatchClient,
  PutMetricDataCommand,
} = require("@aws-sdk/client-cloudwatch");
require('dotenv');
const environment = process.env.ENVIRONMENT || "PROD";
const StatsD = require('node-statsd');


const winston = require("winston");
require("winston-cloudwatch");
const {combine, timestamp, json} = winston.format;
const region = process.env.AWS_REGION;

const customFormat = json(({ level, message, method, endpoint }) => {
  return { level,message,method,endpoint}
});

// Setup Winston to log to CloudWatch
const logger = winston.createLogger({
  //level: "info",
  format: combine(timestamp({utc:true}), customFormat),
  transports: [
    environment !== "PROD" ? new winston.transports.File({ filename: 'csye6225.log'}) : 
    new winston.transports.File({ filename: '/var/log/webapp/csye6225.log'})
    
    
    // new winston.transports.CloudWatch({
    //   logGroupName: "webappLogs",
    //   logStreamName: "webappStream",
    //   cloudWatchLogs: new CloudWatchLogs({
    //     region: region,
    //   }),
    // }),
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
  console.log("logging", JSON.stringify(structuredLog))
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

const client = new StatsD({ host: 'localhost', port: 8125 });

//const client = new StatsD({host: 'localhost', port:8125});
//const client = new CloudWatchClient({ region: region });

const sendMetric = async (metricName, value, endpoint, method, unit) => {
  const metricKey = `webapp.${metricName}.${method}.${endpoint}`;

  if (unit==='Milliseconds') {
    client.timing(metricKey, value);
  } else if (unit==='Count'){
    client.increment(metricKey,value);
  } else {
    client.gauge(metricKey, value);
  }
  // const params = {
  //   MetricData: [
  //     {
  //       MetricName: metricName,
  //       Dimensions: [
  //         { Name: "Endpoint", Value: endpoint },
  //         { Name: "Method", Value: method },
  //       ],
  //       Unit: unit,
  //       Value: value,
  //     },
  //   ],
  //   Namespace: "WebAppMetrics",
  // };
  // console.log("The parameters are", params)
  // await client.send(new PutMetricDataCommand(params));
  console.log('sent metric to statsD', {metricKey,value})
};

module.exports = { logger, sendMetric, client };
