# CRUD Master

CRUD Master is an educational movie platform that demonstrates how a system can split responsibilities between independent microservices. The Inventory API manages movies, the Billing service processes orders, and the API Gateway gives clients one entry point.

Inventory communication is synchronous HTTP. Billing communication is asynchronous AMQP messaging: RabbitMQ keeps accepted orders in a durable queue while the Billing consumer is unavailable and delivers them when it returns.

## Architecture

```text
Client ──HTTP──> API Gateway
                    │
                    ├──HTTP──> Inventory API ──PostgreSQL──> movies_db
                    │
                    └──AMQP──> RabbitMQ billing_queue ──AMQP──> Billing consumer
                                                                  │
                                                                  └──PostgreSQL──> billing_db
```

| Virtual machine | Address | Components |
| --- | --- | --- |
| `gateway-vm` | `192.168.57.10` | API Gateway |
| `inventory-vm` | `192.168.57.11` | Inventory API and PostgreSQL `movies_db` database |
| `billing-vm` | `192.168.57.12` | RabbitMQ, Billing consumer, and PostgreSQL `billing_db` database |

The VMs communicate through the isolated VirtualBox internal network `crud-master-network`. The host exposes only the Gateway and RabbitMQ management ports.

## Technology stack

- Python 3 and Flask
- SQLAlchemy with PostgreSQL and Psycopg
- RabbitMQ and `pika`
- `requests` for the Inventory HTTP proxy
- PM2 process management
- Vagrant with VirtualBox
- OpenAPI and Postman

Each Python service has its own pinned `requirements.txt` and isolated virtual environment because the services are independently installable and have different dependencies.

## Prerequisites

Install the following on the host machine:

- VirtualBox 7 or another compatible Vagrant provider
- Vagrant 2.4 or later
- Hardware virtualization enabled in BIOS/UEFI
- Postman for importing and running the committed collection

Python, PostgreSQL, RabbitMQ, Node.js, and PM2 are installed inside the appropriate VMs by the provisioning scripts. Node.js is required only as the runtime for PM2; all three project services run with Python.

## Configuration

All configuration and exercise credentials are centralized in the root `.env` file. The Vagrantfile validates the required variables and passes only the variables needed by each VM.

The `.env` file is intentionally committed because this exercise and its audit require it. Its credentials are development-only and must not be reused in a public or production environment. In a real project, `.env` would be ignored and only a `.env.example` template would be committed.

The main configurable values are:

- VM box and private IP addresses
- Gateway and Inventory ports
- PostgreSQL database names, users, and passwords
- RabbitMQ host, ports, user, password, and queue name
- RabbitMQ management host port

No application credential is hardcoded in the Python source.

## Build and run

From the project root, create and provision all three VMs:

```bash
vagrant up --provider=virtualbox
```

The first build downloads the base box and installs the required packages, so it takes longer than later starts. Confirm the result:

```bash
vagrant status
```

The expected machines are:

```text
inventory-vm  running (virtualbox)
billing-vm    running (virtualbox)
gateway-vm    running (virtualbox)
```

After provisioning, the host endpoints are:

- API Gateway: `http://127.0.0.1:3000`
- RabbitMQ management UI: `http://127.0.0.1:15673`

The RabbitMQ UI uses the credentials declared by `RABBITMQ_USER` and `RABBITMQ_PASSWORD` in `.env`.

Useful lifecycle commands:

```bash
vagrant ssh inventory-vm
vagrant ssh billing-vm
vagrant ssh gateway-vm
vagrant halt
vagrant up
vagrant provision
```

`vagrant halt` stops the VMs without deleting them. `vagrant provision` reruns the installation and configuration scripts on existing VMs.

## API endpoints

All client requests go through the Gateway.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/movies` | Retrieve all movies or filter with `?title=name` |
| `POST` | `/api/movies` | Create a movie |
| `DELETE` | `/api/movies` | Delete all movies |
| `GET` | `/api/movies/:id` | Retrieve one movie |
| `PUT` | `/api/movies/:id` | Update one movie |
| `DELETE` | `/api/movies/:id` | Delete one movie |
| `POST` | `/api/billing` | Place an order on `billing_queue` |

Example movie request:

```bash
curl -i -X POST http://127.0.0.1:3000/api/movies/ \
  -H 'Content-Type: application/json' \
  -d '{"title":"A new movie","description":"Very short description"}'
```

Example billing request:

```bash
curl -i -X POST http://127.0.0.1:3000/api/billing/ \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"20","number_of_items":"99","total_amount":"250"}'
```

The full API contract is available in `openapi.yaml`.

## Postman tests

Import the following file into Postman:

```text
postman/CRUD_Master.postman_collection.json
```

The collection variable `gateway_url` defaults to `http://127.0.0.1:3000`. The collection contains every Inventory method and the Billing POST request.

Run requests individually when inspecting database state. Running the entire collection also executes the delete endpoints, so the movies table is empty at the end by design.

## Inspect the databases

Inventory database:

```bash
vagrant ssh inventory-vm
sudo -i -u postgres
psql
\l
\c movies_db
TABLE movies;
```

Billing database:

```bash
vagrant ssh billing-vm
sudo -i -u postgres
psql
\l
\c billing_db
TABLE orders;
```

Use `\q` to leave `psql` and `exit` to leave the `postgres` shell and VM.

## Test queue resilience

First send a Billing POST while all services are online and confirm that the order appears in the `orders` table. Then stop only the Billing consumer:

```bash
vagrant ssh billing-vm
sudo pm2 stop billing_app
sudo pm2 list
```

Send another Billing POST. The Gateway still returns HTTP `200` because RabbitMQ accepted the persistent message, but the new order does not yet appear in PostgreSQL. Restart the consumer:

```bash
sudo pm2 start billing_app
sudo pm2 list
```

The consumer processes the queued message, acknowledges it only after the database insert succeeds, and the new order then appears in the `orders` table.

## PM2 process management

PM2 keeps each Python application running, restarts it after an unexpected failure, stores logs, and restores the saved process list during VM boot. PM2 itself uses Node.js, but it starts each service with that service's virtual-environment Python interpreter.

| VM | PM2 process name |
| --- | --- |
| `gateway-vm` | `api_gateway` |
| `inventory-vm` | `inventory_app` |
| `billing-vm` | `billing_app` |

Inside the relevant VM:

```bash
sudo pm2 list
sudo pm2 logs <process_name> --lines 50 --nostream
sudo pm2 stop <process_name>
sudo pm2 start <process_name>
```

## Provisioning scripts

| Script | Responsibility |
| --- | --- |
| `scripts/common.sh` | Updates APT metadata and installs Node.js 24, PM2, CA certificates, curl, and rsync. Node.js is installed because PM2 requires it. The script also configures PM2 startup with systemd. |
| `scripts/inventory.sh` | Installs Python, PostgreSQL, creates or updates the Inventory role and `movies_db` database, builds the service virtual environment, and starts `inventory_app`. |
| `scripts/billing.sh` | Installs Python, PostgreSQL and RabbitMQ, creates `billing_db`, configures the RabbitMQ user, permissions and management plugin, builds the service virtual environment, then starts `billing_app`. |
| `scripts/gateway.sh` | Installs Python, deploys `api-gateway-app`, builds its virtual environment, writes its VM-specific environment, starts `api_gateway`, and performs an Inventory health request. |

Important shell commands and flags used by the scripts:

- `set -euo pipefail` stops provisioning on command failures, missing variables, or failed pipeline stages.
- `systemctl enable --now` starts a service immediately and enables it for future boots.
- `runuser -u postgres -- ...` executes a database administration command as the PostgreSQL system user.
- `rabbitmqctl set_permissions -p / USER '.*' '.*' '.*'` allows the exercise user to configure, write to, and read from resources in the `/` virtual host.
- `rsync -a --delete` makes the deployed service copy match the source directory while excluding generated dependency directories such as `.venv`.
- `python3 -m venv .venv` creates an isolated Python environment for one service.
- `.venv/bin/python -m pip install --requirement requirements.txt` installs that service's pinned dependencies.
- `pm2 start server.py --interpreter ...` runs a Python entry point with its virtual-environment interpreter.
- `pm2 save --force` saves the process list that PM2 restores during boot.

The scripts are idempotent: running `vagrant provision` again updates existing users, copies the latest source, reinstalls pinned dependencies, and restarts the relevant process instead of creating duplicate resources.

## Manual service startup

For development without Vagrant, install and configure PostgreSQL and RabbitMQ according to `.env`. Create an isolated virtual environment and install dependencies inside each service directory:

```bash
cd srcs/inventory-app
python3 -m venv .venv
./.venv/bin/python -m pip install --requirement requirements.txt

cd ../billing-app
python3 -m venv .venv
./.venv/bin/python -m pip install --requirement requirements.txt

cd ../api-gateway-app
python3 -m venv .venv
./.venv/bin/python -m pip install --requirement requirements.txt
```

Start each service from its own directory in a separate terminal:

```bash
./.venv/bin/python server.py
```

Start Inventory and Billing before the Gateway for the initial connection. The recommended and audited execution method remains `vagrant up`.

## Design choices

- The Gateway contains routing concerns but no Inventory business logic.
- Inventory uses HTTP because the client needs an immediate resource response.
- Billing uses a durable queue and persistent messages because order acceptance must not depend on the consumer being online.
- The Billing consumer uses manual acknowledgements after successful persistence, preventing RabbitMQ from discarding an order before it reaches PostgreSQL.
- Each service owns its database and dependencies, reducing coupling between services.
- VM-specific `.env` files are generated with mode `0600`, so only root can read their credentials.
- Application code is copied to `/opt/crud-master` and managed by PM2, while dependencies are regenerated from each service's pinned `requirements.txt`.
