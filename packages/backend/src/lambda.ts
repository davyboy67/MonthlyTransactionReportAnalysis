import serverlessExpress from '@vendia/serverless-express';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { createApp } from './app';

type ServerlessExpressHandler = (event: APIGatewayProxyEvent, context: Context) => Promise<unknown>;

let serverlessExpressInstance: ServerlessExpressHandler | undefined;

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<unknown> => {
  if (!serverlessExpressInstance) {
    console.log('Initializing Express app');
    const app = await createApp();
    serverlessExpressInstance = serverlessExpress({ app }) as unknown as ServerlessExpressHandler;
  }

  return serverlessExpressInstance(event, context);
};
