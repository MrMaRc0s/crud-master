# CRUD Master

CRUD Master is an educational movie management platform that demonstrates how responsibilities can be separated between independent microservices. The Inventory API manages the available movies, the Billing service processes orders, and the API Gateway provides clients with a single entry point to the system.

The project uses synchronous HTTP communication for Inventory and asynchronous messaging for Billing. A message queue allows orders to wait safely while the Billing application is temporarily stopped and to be processed after it starts again.
