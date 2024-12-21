import { SubscriptionClient } from 'subscriptions-transport-ws';
import { ApolloClient, InMemoryCache } from '@apollo/client';
import gql from 'graphql-tag';

//ws://localhost:4000/graphql
const GRAPHQL_ENDPOINT_WS = 'ws://localhost:4000/graphql';
const GRAPHQL_ENDPOINT_HTTP = '/graphql';

const client = new SubscriptionClient(GRAPHQL_ENDPOINT_WS, {
    reconnect: true,
});

const apolloClient = new ApolloClient({
  networkInterface: client,
  cache: new InMemoryCache(),
});

export default apolloClient;