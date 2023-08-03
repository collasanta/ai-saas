import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda'
import { prismadbbot } from './database'

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const result = await prismadbbot.botChannels.findFirst()

  return {
    statusCode: 200,
    body: JSON.stringify(result),
  }
}


