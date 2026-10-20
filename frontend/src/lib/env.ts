/** Build-time configuration from `VITE_*` variables. See `.env.example`. */
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/+$/, ''),
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ?? '',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? '',
    domain: import.meta.env.VITE_COGNITO_DOMAIN ?? '',
  },
};
