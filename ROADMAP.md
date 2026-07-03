# Roadmap

This roadmap reflects planned directions for the Fraud Detection Platform. It is indicative, not a committed
delivery schedule.

## Near Term

- **Configurable ML risk scoring** — introduce a trainable model-based score as an additional signal alongside
  the deterministic rule engine, with the rule engine retained for explainability.
- **Role-based access control** — distinct permission levels for analysts, senior investigators, and
  administrators (currently a single investigator role).
- **Multi-channel alerting** — email/SMS/Slack delivery for critical fraud alerts in addition to the in-app
  notification stream.
- **Bulk case actions** — assign, close, or escalate multiple alerts at once from the Fraud Alert Center.

## Mid Term

- **Kafka-based event streaming** — the Redis pub/sub event bus (`app/services/event_bus.py`) was designed with
  a producer/consumer boundary that mirrors Kafka's shape, so this is a swap of the transport layer, not a
  redesign of callers.
- **Multi-tenant support** — isolate customers, rules, and users per organization for platform deployments
  serving more than one bank or payment provider.
- **Case management integrations** — export investigation reports and alert data to external case management or
  SIEM systems.

## Long Term

- **Adaptive rule tuning** — suggest weight/threshold adjustments based on historical false-positive and
  false-negative rates.
- **Cross-institution fraud signal sharing** — opt-in sharing of blacklist and fraud pattern signals across
  deployments.

## Feedback

Roadmap suggestions are welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md) for how to propose changes.
