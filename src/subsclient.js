import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { SubscriptionClient } from 'subscriptions-transport-ws';

//ws://localhost:4000/graphql
const GRAPHQL_ENDPOINT_WS = 'ws://localhost:4000/graphql';
const GRAPHQL_ENDPOINT_HTTP = '/graphql';

const wsLink = new SubscriptionClient(GRAPHQL_ENDPOINT_WS, {
    reconnect: true,
});

const httpLink = new HttpLink({
uri: GRAPHQL_ENDPOINT_HTTP,
});

const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    wsLink,
    httpLink
);

const apolloClient = new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
});

export default apolloClient;