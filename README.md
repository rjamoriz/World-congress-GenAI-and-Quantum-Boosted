# World Congress GenAI and Quantum-Boosted Agenda Manager

> **Copilot-first agenda manager** that qualifies requests → proposes optimal slots with a quantum-inspired scheduler → prepares materials → automates follow-ups.

## 🎯 Executive Focus

Build a copilot-first agenda manager that qualifies requests → proposes optimal slots with a quantum-inspired scheduler → prepares materials → automates follow-ups, exposing human-in-the-loop controls via a dark-mode Neumorphism Next.js UI and a MERN backend with GenAI microservice.

## 🏗️ Architecture Overview

### Frontend (Next.js + React + TypeScript)
- **Dark Mode + Neumorphism** via Tailwind + Radix UI components
- **Copilot Dashboard**: qualification scoring, suggested slots, approve/reject modals
- **Real-time UI**: WebSockets for schedule updates & optimistic UI
- **Host Prep Panel**: materials generation and preparation workflows
- **Post-Visit Automation Panel**: follow-up pipelines

### Backend (Node.js/Express) — Service Oriented
- **Auth Service**: JWT, OAuth for Outlook/Salesforce integration
- **GenAI Service**: classification, importance scoring, template generation
- **Scheduler Service**: QUBO + classical optimization for slot assignment
- **Workflow Service**: materials generation, Excel export, accreditation, follow-ups
- **Integrations**: Outlook Calendar, Salesforce, Fraud/Dedup APIs, Excel export

### Data Layer
- **MongoDB**: Requests, audit logs, user data
- **Redis**: Caching, locks, real-time state

### Optimization Stack
- **Quantum-inspired**: QUBO model with simulated annealing / D-Wave
- **Classical Fallback**: OR-Tools CP-SAT with constraints & soft penalties
- **Observability**: OpenTelemetry traces, structured logs, audit trails

## 📦 Project Structure

```
.
├── frontend/              # Next.js application
│   ├── app/              # App router pages
│   ├── components/       # React components
│   ├── lib/              # Utilities & hooks
│   └── styles/           # Tailwind + custom styles
├── backend/              # Express/NestJS API
│   ├── src/
│   │   ├── services/     # Microservices
│   │   │   ├── auth/
│   │   │   ├── genai/
│   │   │   ├── scheduler/
│   │   │   └── workflow/
│   │   ├── routes/       # API routes
│   │   ├── models/       # MongoDB models
│   │   └── utils/        # Shared utilities
│   └── tests/            # Backend tests
├── shared/               # Shared TypeScript types & constants
├── data/                 # Synthetic data generator
├── infra/                # Infrastructure as Code (Terraform, K8s)
└── docs/                 # Documentation & ADRs
```

## 🚀 Deliverable Roadmap

### MVP (Phase 1) - 2-3 Sprints
- [x] Project structure & monorepo setup
- [ ] Synthetic data generator (100+ entries)
- [ ] REST API: CRUD requests, qualification endpoint
- [ ] Simple classical scheduler (OR-Tools)
- [ ] Frontend: Request list + Copilot suggestion card + Approve/Reject
- [ ] Export to Excel & mock Outlook sync

### Phase 2 - GenAI & Quantum Integration
- [ ] GenAI service (classification templates & automated communications)
- [ ] QUBO formulation + quantum/simulated annealer (D-Wave)
- [ ] Fraud detection & Salesforce integration
- [ ] Real-time WebSocket updates

### Phase 3 - Production Hardening
- [ ] Auth system (JWT, OAuth)
- [ ] Observability: OpenTelemetry, structured logs
- [ ] Testing: unit, integration, E2E
- [ ] Infrastructure: Terraform, K8s deployment, autoscaling
- [ ] UX polish: animations, accessibility, keyboard flows

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **UI**: React 18+, TypeScript
- **Styling**: Tailwind CSS, Radix UI, Lucide Icons
- **State**: Zustand / Jotai
- **Real-time**: Socket.io-client

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js / NestJS
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose ODM)
- **Cache**: Redis
- **Queue**: Bull / BullMQ

### Optimization
- **Classical**: OR-Tools (Python bridge) or MILP
- **Quantum**: D-Wave Ocean SDK (simulated annealing)
- **Heuristics**: Simulated annealing, genetic algorithms

### AI/ML
- **LLM**: OpenAI GPT-4 / Anthropic Claude
- **Embeddings**: OpenAI embeddings for semantic search
- **Classification**: Fine-tuned models for request qualification

### DevOps
- **CI/CD**: GitHub Actions
- **Containers**: Docker, Docker Compose
- **Orchestration**: Kubernetes (optional)
- **IaC**: Terraform
- **Monitoring**: Prometheus, Grafana, OpenTelemetry

## 🚦 Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+ (for optimization services)
- MongoDB 7+
- Redis 7+
- Docker & Docker Compose (recommended)

### Installation

```bash
# Install dependencies for all workspaces
npm install

# Set up environment variables
cp .env.example .env

# Start development services (MongoDB, Redis)
docker-compose up -d

# Run synthetic data generator
npm run generate-data

# Start backend
npm run dev:backend

# Start frontend (in new terminal)
npm run dev:frontend
```

### Environment Variables

```env
# API
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/agenda-manager
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=your_key_here

# D-Wave (optional)
DWAVE_API_TOKEN=your_token_here

# Integrations
OUTLOOK_CLIENT_ID=
OUTLOOK_CLIENT_SECRET=
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
```

## 📚 Key Concepts

### 1. Request Qualification
- **Classification**: Meeting type (strategic, operational, sales, etc.)
- **Importance Scoring**: 0-100 based on company tier, strategic value, urgency
- **Fraud Detection**: Duplicate detection, anomaly detection

### 2. Quantum-Inspired Scheduling
- **QUBO Formulation**: Binary variables for slot assignments
- **Constraints**: Host availability, preferences, max meetings per day
- **Objective**: Maximize total importance score with soft penalties
- **Fallback**: Classical CP-SAT solver for reliability

### 3. Workflow Automation
- **Materials Generation**: Briefing docs, presentations via GenAI
- **Follow-ups**: Automated emails with personalized content
- **Accreditation**: Badge generation, access control
- **Export**: Excel reports with full schedule

### 4. Human-in-the-Loop
- **Copilot Suggestions**: AI proposes, human approves
- **Override Controls**: Manual slot reassignment
- **Audit Trail**: All decisions logged with explanations

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend unit tests
npm run test:backend

# Frontend component tests
npm run test:frontend

# E2E tests
npm run test:e2e

# Load testing with synthetic data
npm run test:load
```

## 📖 Documentation

- [API Documentation](./docs/API.md)
- [Architecture Decision Records](./docs/ADRs/)
- [Scheduler Algorithm](./docs/SCHEDULER.md)
- [GenAI Service](./docs/GENAI.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open Pull Request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

## 👥 Team

- **Architecture & Planning**: Ruben
- **Development**: [Team Members]
- **QA**: [Team Members]

## 🎯 Current Status

**Phase**: MVP Development  
**Sprint**: 1/3  
**Last Updated**: 2025-10-06

---

*Built with ❤️ for the World Congress on GenAI and Quantum Computing*
