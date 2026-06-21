# Security Notes for Workshop Attendees

## During the Workshop

By default the workshop deploys Cloud Run services **private**
(`--no-allow-unauthenticated`, matching the official codelab). Only callers with a
`gcloud` identity token and the `run.invoker` role can reach the service — Step 10
shows how to call it with your token.

Step 9 has an **optional** public-access path (binding `allUsers` to
`run.invoker`) — needed only for the browser chat UI in Step 11. **If you take
it**, the trade-offs are:

1. Anyone with your service URL can call it
2. Prompts may be logged by Cloud Run
3. Do not paste real customer data, API keys, internal documents, or PII
4. Remove the `allUsers` binding as soon as the demo is over

## After the Workshop

If you enabled public access, remove it before leaving the deployment in place:

1. Either delete the service entirely:
```bash
   gcloud run services delete $SERVICE_NAME --region asia-southeast1 --quiet
```

2. Or lock it down with proper auth:
```bash
   gcloud run services update $SERVICE_NAME \
       --region asia-southeast1 --no-allow-unauthenticated
```

## Production Deployment

For production, follow these patterns:
- Deploy with `--no-allow-unauthenticated`
- Put a thin auth proxy (Firebase Functions or IAP) in front
- Use a dedicated service account with least privilege
- Enable Cloud Logging audit logs
- Set up Cloud Monitoring alerts for usage spikes

See the original Google codelab for production-grade authentication patterns.
