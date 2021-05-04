const { Requester } = require("@chainlink/external-adapter");
const Vision = require("azure-cognitiveservices-vision");
const CognitiveServicesCredentials = require("ms-rest-azure")
  .CognitiveServicesCredentials;
const https = require("https");
const Stream = require("stream").Transform;

const createRequest = async (input, callback) => {
  const credentials = new CognitiveServicesCredentials(
    process.env.CONTENT_MODERATOR_SUBSCRIPTION_KEY
  );

  const contentModeratorApiClient = new Vision.ContentModeratorAPIClient(
    credentials,
    process.env.CONTENT_MODERATOR_ENDPOINT
  );

  return performRequest({
    input,
    callback,
    contentModeratorApiClient
  });
};

const performRequest = ({ input, callback, contentModeratorApiClient }) => {
  const { data, id: jobRunID } = input;

  if (!data) {
    callback(500, Requester.errored(jobRunID, "No data"));
    return;
  }

  const { hash } = data;

  if (jobRunID === undefined) {
    callback(500, Requester.errored(jobRunID, "Job run ID required"));
    return;
  }

  if (hash === undefined) {
    callback(500, Requester.errored(jobRunID, "Content hash required"));
  } else {
    const url = `https://${process.env.IPFS_GATEWAY_URL}/ipfs/${hash}`;

    try {
      https
        .request(url, function(response) {
          var imgBytesStream = new Stream();

          response.on("data", function(chunk) {
            imgBytesStream.push(chunk);
          });

          response.on("end", function() {
            requestModerationLabels(imgBytesStream.read());
          });
        })
        .end();

      const requestModerationLabels = async imgBytes => {
        try {
          const moderationLabels = await contentModeratorApiClient.imageModeration.evaluateFileInput(
            imgBytes
          );

          const {
            adultClassificationScore,
            racyClassificationScore
          } = moderationLabels;

          const convertedResult = convertLabelsToTrueSightFormat({
            adultScore: adultClassificationScore,
            racyScore: racyClassificationScore
          });

          const response = {
            data: moderationLabels
          };

          response.data.result = convertedResult;

          callback(200, Requester.success(jobRunID, response));
        } catch (error) {
          console.error(error);
          callback(500, Requester.errored(jobRunID, error));
        }
      };
    } catch (error) {
      console.error(error);
      callback(500, Requester.errored(jobRunID, error));
    }
  }
};

const getConfidenceFromScore = decimalScore => {
  const asPercentage = decimalScore * 100;
  return Math.round(parseFloat(asPercentage));
};

/**
 * Azure Cognitive Services provides results with decimal confidence scores between 0 and 1
 * @param {number} adultScore The confidence score for adult content
 * @param {number} racyScore The confidence score for racy content
 */
const convertLabelsToTrueSightFormat = ({ adultScore, racyScore }) => {
  const adultConfidence = getConfidenceFromScore(adultScore);
  const suggestiveConfidence = getConfidenceFromScore(racyScore);

  return [adultConfidence, suggestiveConfidence, "", "", ""].join(",");
};

// This is a wrapper to allow the function to work with
// GCP Functions
exports.gcpservice = (req, res) => {
  createRequest(req.body, (statusCode, data) => {
    res.status(statusCode).send(data);
  });
};

// This is a wrapper to allow the function to work with
// AWS Lambda
exports.handler = (event, context, callback) => {
  createRequest(event, (statusCode, data) => {
    callback(null, data);
  });
};

// This is a wrapper to allow the function to work with
// newer AWS Lambda implementations
exports.handlerv2 = (event, context, callback) => {
  createRequest(JSON.parse(event.body), (statusCode, data) => {
    callback(null, {
      statusCode: statusCode,
      body: JSON.stringify(data),
      isBase64Encoded: false
    });
  });
};

// This allows the function to be exported for testing
// or for running in express
module.exports.createRequest = createRequest;
module.exports.performRequest = performRequest;
