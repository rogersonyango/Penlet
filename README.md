# Penlet - Educational Management Platform

A comprehensive role-based Progressive Web Application (PWA) for educational management, designed specifically for Uganda's education system (Senior 1-6).

## Features

### For Students
- **Subjects**: View enrolled subjects with content access
- **Notes**: Download PDF notes organized by subject
- **Timetable**: Personal, editable schedule system
- **Assignments**: Submit assignments with rich text editor and file uploads
- **Videos**: Watch educational videos organized by subject
- **Flashcards**: Create and study with flashcards
- **Games**: Educational games (Memory Match, Word Scramble, Quick Math, Typing Race)
- **Alarms**: Personal reminder system
- **AI Chatbot**: Integrated study assistant
- **Analytics**: Track learning progress

### For Teachers
- **Content Management**: Upload notes, videos, and assignments
- **Student Progress**: Monitor individual and class performance
- **Assignment Review**: Grade submitted student work
- **Timetable**: Personal schedule management

### For Administrators
- **User Management**: Add/remove teachers and students
- **Subject Management**: Create and organize curriculum
- **Content Approval**: Review teacher-uploaded materials
- **Platform Analytics**: Usage and performance metrics

## 🛠 Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT with refresh tokens
- **Security**: Rate limiting, input validation, password hashing (Argon2)

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand + React Query
- **PWA**: Vite PWA plugin with offline support

## Project Structure

```
penlet/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/    # API endpoints
│   │   ├── core/                # Config, security, database
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic
│   │   ├── middleware/          # Rate limiting, security headers
│   │   └── main.py              # FastAPI app entry
│   ├── migrations/              # Alembic migrations
│   ├── requirements.txt
│   └── alembic.ini
│
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── context/             # State management
│   │   ├── services/            # API services
│   │   └── styles/              # CSS files
│   ├── package.json
│   └── vite.config.js
│
└── docs/                        # Documentation
```

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create `.env` file in backend directory:

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/penlet_db

# Security
SECRET_KEY=your-super-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Environment
ENVIRONMENT=development
DEBUG=true

# CORS
BACKEND_CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Security Features

- **JWT Authentication** with access and refresh tokens
- **Role-Based Access Control** (RBAC)
- **Rate Limiting** on all endpoints
- **Password Policy** enforcement
- **Account Lockout** after failed attempts
- **Input Validation** with Pydantic
- **SQL Injection Prevention** with parameterized queries
- **XSS Protection** with content security headers
- **CSRF Protection** for form submissions

## PWA Features

- **Offline Support** with service worker caching
- **Installable** on desktop and mobile
- **Push Notifications** (configurable)
- **Responsive Design** for all screen sizes

## Testing

### Backend
```bash
cd backend
pytest --cov=app tests/
```

### Frontend
```bash
cd frontend
npm run test
```

## Deployment

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run migrations: `alembic upgrade head`
4. Start backend: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app`
5. Build frontend: `npm run build`
6. Serve frontend with nginx

## API Documentation

- Swagger UI: `http://localhost:8000/api/v1/docs`
- ReDoc: `http://localhost:8000/api/v1/redoc`

## Design System

### Colors
- **Primary**: Purple gradient (#7c3aed to #9333ea)
- **Accent**: Blue (#3b82f6)
- **Highlight**: Yellow/Gold (#facc15)
- **Dark Theme**: Slate (#0f172a to #1e293b)

### Typography
- **Display**: Plus Jakarta Sans
- **Body**: Inter
- **Monospace**: JetBrains Mono

## Roadmap

- [ ] Email verification
- [ ] Real-time notifications with WebSockets
- [ ] Video streaming optimization
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Multi-language support

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

