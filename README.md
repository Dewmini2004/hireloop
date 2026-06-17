# HireLoop 🚀
### AI-Powered Mock Interview Platform — Microservices Architecture

> Paste any job description. Get interviewed by AI tailored to that exact role. Know your gaps before the real interview.

---

## Architecture

```
Frontend (React+Vite) → API Gateway (Express)
                              ├── Auth Service      (Node.js + JWT + Redis)
                              ├── Job Parser        (FastAPI + GPT-4o)
                              ├── Interview Service (FastAPI + GPT-4o + RabbitMQ)
                              ├── Evaluation Service(FastAPI + GPT-4o, async consumer)
                              ├── Progress Service  (Node.js + PostgreSQL)
                              └── Notification Svc  (Node.js + WebSockets)
```

## Quick Start

### 1. Clone & Configure
```bash
cp .env.example .env
# Add your OpenAI API key to .env
```

### 2. Run Everything
```bash
docker-compose up --build
```

### 3. Open App
```
Frontend:  http://localhost:3000
Gateway:   http://localhost:4000
RabbitMQ:  http://localhost:15672 (guest/guest)
```

## Services & Ports

| Service              | Port | Tech               |
|----------------------|------|--------------------|
| Frontend             | 3000 | React + Vite       |
| API Gateway          | 4000 | Express.js         |
| Auth Service         | 4001 | Node.js + Redis    |
| Job Parser           | 4002 | FastAPI + GPT-4o   |
| Interview Service    | 4003 | FastAPI + GPT-4o   |
| Evaluation Service   | 4004 | FastAPI (consumer) |
| Progress Service     | 4005 | Node.js + Postgres |
| Notification Service | 4006 | Node.js + WS       |

## Dev (without Docker)

```bash
# Each service independently
cd auth-service && npm install && npm run dev
cd job-parser-service && pip install -r requirements.txt && python main.py
# etc.
```

## Tech Stack
- **Frontend**: React 18, Vite, TailwindCSS
- **Backend**: Node.js (Express), Python (FastAPI)
- **AI**: OpenAI GPT-4o
- **Databases**: PostgreSQL (per service), Redis
- **Messaging**: RabbitMQ
- **Infrastructure**: Docker, Docker Compose
