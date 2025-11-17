# Curocity Project Structure

This document outlines the complete folder and file structure of the Curocity monorepo. For a more exhaustive, file-by-file breakdown, please see `docs/project-tree.md`.

/
├── .dockerignore
├── .env
├── .env.example
├── .env.local
├── .eslintrc.json
├── .firebaserc
├── .gitignore
├── Dockerfile
├── README.md
├── TREE.md
├── android/  (Native Android project wrapper)
│   └── ...
├── assets/ (For app icons)
│   └── README.md
├── backend/ (Firebase Functions Workspace)
│   ├── src/
│   │   ├── index.ts (Main functions entry point)
│   │   ├── modules/ (Business logic for different ecosystems)
│   │   │   ├── automation/
│   │   │   ├── cure/
│   │   │   ├── maintenance/
│   │   │   ├── mechanic/
│   │   │   └── ride/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
├── docs/ (All project documentation)
│   ├── ADMIN_WORKFLOW.md
│   ├── AD_SCRIPT.md
│   ├── APPOINTMENT_WORKFLOW.md
│   ├── ARCHITECTURE.md
│   ├── BLUEPRINT.md
│   ├── BRIEF.md
│   ├── CHANGELOG.md
│   ├── CODE_STRUCTURE.md
│   ├── CURE_OVERVIEW.md
│   ├── CURE_USER_CONNECT.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── FIREBASE_QUERY_GUIDE.md
│   ├── FLOWCHART.md
│   ├── FLUTTER_PROMPT.md
│   ├── FRAMER_PROMPT.md
│   ├── GARAGE_BLUEPRINT.md
│   ├── GITHUB_GUIDE.md
│   ├── GUIDE.md
│   ├── HYBRID_ARCHITECTURE.md
│   ├── IMPROVEMENT_PLAN.md
│   ├── MARKET_RESEARCH.md
│   ├── N8N_NEW_PARTNER_WORKFLOW.json
│   ├── N8N_OPENROUTER_WORKFLOW.json
│   ├── N8N_WORKFLOW_GUIDE.md
│   ├── NGROK_GUIDE.md
│   ├── NO_COST_ARCHITECTURE.md
│   ├── ONBOARDING_BLUEPRINT.md
│   ├── PATH_ONBOARDING_FLOW.md
│   ├── PITCH.md
│   ├── PITCH_DECK_FOR_COPY.md
│   ├── PORTFOLIO_GUIDE.md
│   ├── PORT_CONFLICT_GUIDE.md
│   ├── POSTGRES_SCHEMA_PROMPT.md
│   ├── PROJECT_READINESS_REPORT.md
│   ├── RESCUE_PARTNER_BLUEPRINT.md
│   ├── SUPPORT_BLUEPRINT.md
│   ├── TESTING_REPORT.md
│   ├── backend.json (Data models for the entire app)
│   └── project-tree.md (Detailed file tree)
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── frontend/ (Next.js Frontend Workspace)
│   ├── src/
│   │   ├── app/ (Core App Router)
│   │   │   ├── (auth)/ (Login pages)
│   │   │   ├── (dashboard)/ (All user dashboards)
│   │   │   │   ├── admin/
│   │   │   │   ├── user/
│   │   │   │   └── resq/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx (Landing Page)
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── ui/ (ShadCN base components)
│   │   │   └── shared/ (Reusable components like BrandLogo)
│   │   ├── features/ (Business logic components for each role)
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   └── user/
│   │   ├── lib/ (Core logic and configs)
│   │   │   ├── firebase/ (All Firebase client-side code)
│   │   │   ├── translations.ts
│   │   │   └── utils.ts
│   │   └── ...
│   ├── public/ (Static assets like images)
│   ├── next.config.js
│   ├── package.json
│   └── tailwind.config.ts
├── package.json (Monorepo root)
└── ...
