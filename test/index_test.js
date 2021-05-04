const assert = require("chai").assert;
const performRequest = require("../index.js").performRequest;
require("dotenv").config();

const createVisionFake = () => ({
  imageModeration: {
    evaluateFileInput: imgBytes => ({
      trackingId: "00a8564c-3b19-4492-82c1-6948486d21a0",
      adultClassificationScore: 0.11061398684978485,
      isImageAdultClassified: false,
      racyClassificationScore: 0.9687211960554123,
      isImageRacyClassified: true,
      advancedInfo: [],
      status: { code: 3000, description: "OK" }
    })
  }
});

describe("performRequest", () => {
  const jobID = "1";

  context("successful calls", () => {
    const requests = [
      {
        name: "standard",
        testData: {
          id: jobID,
          data: { hash: "QmWATWQ7fVPP2EFGu71UkfnqhYXDYH566qy47CnJDgvs8u" }
        }
      }
    ];

    requests.forEach(req => {
      it(`${req.name}`, done => {
        var visionStub = createVisionFake();

        performRequest({
          input: req.testData,
          callback: (statusCode, data) => {
            assert.equal(statusCode, 200);
            assert.equal(data.jobRunID, jobID);
            assert.isNotEmpty(data.data);
            done();
          },
          contentModeratorApiClient: visionStub
        });
      });
    });
  });

  context("error calls", () => {
    const requests = [
      { name: "empty body", testData: {} },
      { name: "empty data", testData: { data: {} } }
    ];

    requests.forEach(req => {
      it(`${req.name}`, done => {
        performRequest({
          input: req.testData,
          callback: (statusCode, data) => {
            assert.equal(statusCode, 500);
            assert.equal(data.jobRunID, jobID);
            assert.equal(data.status, "errored");
            assert.isNotEmpty(data.error);
            done();
          }
        });
      });
    });
  });
});
