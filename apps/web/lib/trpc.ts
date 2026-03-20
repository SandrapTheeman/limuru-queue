// tRPC Client Configuration (for future use with tRPC router)
import { createTRPCReact, httpBatchLink } from '@trpc/react-query';

// Note: The API currently uses REST endpoints, not tRPC
// This client is set up for when tRPC is fully implemented on the backend

export const trpc = createTRPCReact<any>();

export const trpcClientConfig = {
  links: [
    httpBatchLink({
      url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/trpc',
    }),
  ],
};
