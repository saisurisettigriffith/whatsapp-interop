# Kubernetes Manifests

Placeholder for service deployments, HPAs, and canary rollout manifests. Use Helm or Kustomize per team preference. Include:

- Deployments for each service with resource requests/limits
- Services (ClusterIP) and Ingress definitions
- HorizontalPodAutoscaler definitions for WS gateway and messaging/delivery workers
- PodDisruptionBudgets to maintain quorum during maintenance
