import { Serverless } from 'serverless/aws';

const serverlessConfiguration: Serverless = {
  unresolvedVariablesNotificationMode: "error",
  service: {
    name: 'sls-legobot',
    // app and org for use with dashboard.serverless.com
    //org: 'shapediver',
    //app: 'cloudformation-macro-expand-parameters'
  },
  frameworkVersion: '>=1.72.0',
  custom: {
   
  },
  // Add the serverless-webpack plugin
  plugins: ['serverless-bundle'],
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    stage: "${opt:stage, 'dev'}",
    region: "${opt:region, 'us-east-1'}",
    timeout: 180,
    memorySize: 1024,
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    },
    deploymentBucket: {
      name: "shapediver-serverlessdeploy-${self:provider.region}"
    }
  },
  functions: {
    process: {
      handler: 'src/handlers/handler.process',
      events: [
        {
          eventBridge: {
            schedule: "rate(5 minutes)"
          }
        }
      ]
    }
  }
}

module.exports = serverlessConfiguration;
