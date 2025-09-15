import json
import urllib3
from typing import Dict, Any

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Spacelift Auth Lambda

    Exchanges Spacelift API credentials for JWT token using Spacelift's apiKeyUser mutation
    Reads credentials from headers and returns the JWT token from Spacelift API
    """
    try:

        # Extract credentials from headers
        # API Gateway can transform header names to lowercase
        headers = event.get('headers', {}) or {}

        # Try both original and lowercase versions
        api_key_id = (headers.get('x-spacelift-key-id') or
                     headers.get('X-Spacelift-Key-Id') or
                     headers.get('X-SPACELIFT-KEY-ID'))

        api_key_secret = (headers.get('x-spacelift-key-secret') or
                         headers.get('X-Spacelift-Key-Secret') or
                         headers.get('X-SPACELIFT-KEY-SECRET'))

        spacelift_endpoint = (headers.get('x-spacelift-endpoint') or
                             headers.get('X-Spacelift-Endpoint') or
                             headers.get('X-SPACELIFT-ENDPOINT'))

        print(f"Extracted values - ID: {'SET' if api_key_id else 'MISSING'}, Secret: {'SET' if api_key_secret else 'MISSING'}, Endpoint: {'SET' if spacelift_endpoint else 'MISSING'}")

        # Validate required headers
        if not api_key_id or not api_key_secret or not spacelift_endpoint:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'https://spacelift.io',
                    'Access-Control-Allow-Headers': 'Content-Type,x-spacelift-key-id,x-spacelift-key-secret,x-spacelift-endpoint'
                },
                'body': json.dumps({
                    'error': 'Missing required headers: x-spacelift-key-id, x-spacelift-key-secret, x-spacelift-endpoint'
                })
            }

        # Exchange API credentials for JWT token via Spacelift API
        token = get_spacelift_jwt_token(api_key_id, api_key_secret, spacelift_endpoint)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'https://spacelift.io',
                'Access-Control-Allow-Headers': 'Content-Type,x-spacelift-key-id,x-spacelift-key-secret,x-spacelift-endpoint'
            },
            'body': json.dumps({
                'token': token,
                'endpoint': spacelift_endpoint
            })
        }

    except Exception as error:
        print(f'Error exchanging Spacelift credentials for token: {error}')

        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'https://spacelift.io',
                'Access-Control-Allow-Headers': 'Content-Type,x-spacelift-key-id,x-spacelift-key-secret,x-spacelift-endpoint'
            },
            'body': json.dumps({
                'error': 'Failed to authenticate with Spacelift API',
                'details': str(error)
            })
        }

def get_spacelift_jwt_token(key_id: str, key_secret: str, spacelift_endpoint: str) -> str:
    """
    Exchange Spacelift API key for JWT token using the apiKeyUser GraphQL mutation

    Args:
        key_id: Spacelift API Key ID
        key_secret: Spacelift API Key Secret
        spacelift_endpoint: Spacelift GraphQL endpoint URL

    Returns:
        JWT token string from Spacelift API
    """
    http = urllib3.PoolManager()

    # GraphQL mutation for API key authentication
    mutation = """
    mutation ApiKeyUser($id: ID!, $secret: String!) {
        apiKeyUser(id: $id, secret: $secret) {
            jwt
        }
    }
    """

    # Prepare GraphQL request
    graphql_request = {
        'query': mutation,
        'variables': {
            'id': key_id,
            'secret': key_secret
        }
    }

    # Make the request to Spacelift GraphQL API
    response = http.request(
        'POST',
        f'{spacelift_endpoint}/graphql',
        headers={
            'Content-Type': 'application/json'
        },
        body=json.dumps(graphql_request)
    )

    print(f"Spacelift API response status: {response.status}")

    if response.status != 200:
        error_data = response.data.decode() if response.data else 'No response data'
        raise Exception(f'Spacelift API returned HTTP {response.status}: {error_data}')

    # Parse response
    try:
        response_text = response.data.decode() if response.data else None

        if not response_text:
            raise Exception('Empty response from Spacelift API')

        data = json.loads(response_text)
    except json.JSONDecodeError as e:
        raise Exception(f'Failed to parse Spacelift API response: {e}')

    # Check for GraphQL errors
    if data and 'errors' in data:
        error_messages = [error.get('message', 'Unknown error') for error in data['errors']]
        raise Exception(f'Spacelift GraphQL errors: {"; ".join(error_messages)}')

    # Extract JWT token
    if 'data' not in data:
        raise Exception('Unexpected response format from Spacelift API - no data field')

    if 'apiKeyUser' not in data['data']:
        raise Exception('Unexpected response format from Spacelift API - no apiKeyUser field')

    api_key_user = data['data']['apiKeyUser']
    if api_key_user is None:
        raise Exception('Invalid Spacelift API credentials - authentication failed')

    if 'jwt' not in api_key_user:
        raise Exception('Unexpected response format from Spacelift API - no jwt field in apiKeyUser')

    jwt_token = api_key_user['jwt']

    if not jwt_token:
        raise Exception('Spacelift API returned empty JWT token')

    return jwt_token
