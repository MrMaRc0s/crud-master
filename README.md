# CRUD Master

CRUD Master is an educational movie management platform that demonstrates how responsibilities can be separated between independent microservices. The Inventory API manages the available movies, the Billing service processes orders, and the API Gateway provides clients with a single entry point to the system.

The project uses synchronous HTTP communication for Inventory and asynchronous messaging for Billing. A message queue allows orders to wait safely while the Billing application is temporarily stopped and to be processed after it starts again.

## Architecture

```text
Client ──HTTP──> API Gateway
                    │
                    ├──HTTP──> Inventory API ──PostgreSQL──> movies database
                    │
                    └──AMQP──> RabbitMQ billing_queue ──AMQP──> Billing consumer
                                                                  │
                                                                  └──PostgreSQL──> orders database
```

The components are distributed across three virtual machines:

| Virtual machine | Components |
| --- | --- |
| `gateway-vm` | API Gateway |
| `inventory-vm` | Inventory API and PostgreSQL `movies` database |
| `billing-vm` | RabbitMQ, Billing consumer, and PostgreSQL `orders` database |

Inventory requests are synchronous: the client waits while the Gateway forwards the request to the Inventory API and returns its response. Billing requests are asynchronous: the Gateway returns HTTP `200` after RabbitMQ accepts the message, while the Billing consumer may process and store the order later.
