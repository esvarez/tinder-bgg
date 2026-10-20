import type { APIGatewayProxyResultV2 } from 'aws-lambda';

export function handler(): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ok' }),
  };
}
