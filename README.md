# TrueSight genesis external adapter - Azure Cognitive Services

This external adapter downloads image bytes from [IPFS](https://ipfs.io/) given the content hash and requests image moderation labels from [Azure Cognitive Services](https://azure.microsoft.com/en-gb/services/cognitive-services/) cloud-based computer vision platform.

See the [Microsoft documentation](https://docs.microsoft.com/en-us/azure/cognitive-services/content-moderator/image-moderation-api#evaluating-for-adult-and-racy-content) for the result format of the Cognitive Services API

## Environment variables

You will need an Azure account to be able to make requests to the service. See [Microsoft's documentation](https://docs.microsoft.com/en-us/azure/cognitive-services/content-moderator/client-libraries?tabs=visual-studio&pivots=programming-language-rest-api) for help on getting started

| Variable                             |              | Description                                                              |                     Example                     |
| ------------------------------------ | :----------: | ------------------------------------------------------------------------ | :---------------------------------------------: |
| `CONTENT_MODERATOR_SUBSCRIPTION_KEY` | **Required** | Your Azure Content Moderator subscription key                            |       `660daf63efc24de7660daf63efc24de7`        |
| `CONTENT_MODERATOR_ENDPOINT`         | **Required** | Your Azure Content Moderator endpoint                                    | `https://endpoint.cognitiveservices.azure.com/` |
| `IPFS_GATEWAY_URL`                   | **Required** | The IPFS gateway you would like to use                                   |                    `ipfs.io`                    |
| `IPFS_GATEWAY_SSL`                   | **Optional** | Access the gateway via SSL (https)? True/false (Default behaviour: true) |                     `true`                      |

## Example request

### Input

- `hash`: The image's IPFS content hash

### Output

```json
{
  "jobRunID": 0,
  "data": {
    "result": "11,97,,,",
    "trackingId": "916ee61e-954f-4339-8daf-cdc70fa90028",
    "adultClassificationScore": 0.11061398684978485,
    "isImageAdultClassified": false,
    "racyClassificationScore": 0.9687211960554123,
    "isImageRacyClassified": true,
    "advancedInfo": [],
    "status": {
      "code": 3000,
      "description": "OK"
    }
  },
  "result": "11,97,,,"
}
```

## Install Locally

Install dependencies:

```bash
npm i
```

### Test

Run the local tests:

```bash
npm run test
```

Natively run the application (defaults to port 8080):

### Run

```bash
npm start
```

## Call the external adapter/API server

```bash
curl -X POST -H "content-type:application/json" "http://localhost:8080/" --data '{ "id": 0, "data": { "hash": "QmdT7hKV1EfuaXSAYa65KUZWJnxF96yRPZNS9WeG8gUsR2" } }'
```

## Docker

If you wish to use Docker to run the adapter, you can build the image by running the following command:

```bash
docker build . -t external-adapter
```

Then run it with:

```bash
docker run -p 8080:8080 -it external-adapter:latest
```

## Serverless hosts

After [installing locally](#install-locally):

### Create the zip

```bash
zip -r external-adapter.zip .
```

### Install to AWS Lambda

- In Lambda Functions, create function
- On the Create function page:
  - Give the function a name
  - Use Node.js 12.x for the runtime
  - Choose an existing role or create a new one
  - Click Create Function
- Under Function code, select "Upload a .zip file" from the Code entry type drop-down
- Click Upload and select the `external-adapter.zip` file
- Handler:
  - index.handler for REST API Gateways
  - index.handlerv2 for HTTP API Gateways
- Add the environment variable (repeat for all environment variables):
  - Key: API_KEY
  - Value: Your_API_key
- Save

#### To Set Up an API Gateway (HTTP API)

If using a HTTP API Gateway, Lambda's built-in Test will fail, but you will be able to externally call the function successfully.

- Click Add Trigger
- Select API Gateway in Trigger configuration
- Under API, click Create an API
- Choose HTTP API
- Select the security for the API
- Click Add

#### To Set Up an API Gateway (REST API)

If using a REST API Gateway, you will need to disable the Lambda proxy integration for Lambda-based adapter to function.

- Click Add Trigger
- Select API Gateway in Trigger configuration
- Under API, click Create an API
- Choose REST API
- Select the security for the API
- Click Add
- Click the API Gateway trigger
- Click the name of the trigger (this is a link, a new window opens)
- Click Integration Request
- Uncheck Use Lamba Proxy integration
- Click OK on the two dialogs
- Return to your function
- Remove the API Gateway and Save
- Click Add Trigger and use the same API Gateway
- Select the deployment stage and security
- Click Add

### Install to GCP

- In Functions, create a new function, choose to ZIP upload
- Click Browse and select the `external-adapter.zip` file
- Select a Storage Bucket to keep the zip in
- Function to execute: gcpservice
- Click More, Add variable (repeat for all environment variables)
  - NAME: API_KEY
  - VALUE: Your_API_key
