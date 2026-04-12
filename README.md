# Kryptera

Kryptera is a full-stack currency exchange platform (₽ ↔ ZMW). It comprises a Django-based REST API backend and a React/TypeScript frontend.

## Project Structure

The project is split into two main components:

- **`kryptera_back/`**: The Django REST API backend handling users, authentication (JWT), exchange rates, and transaction processing. It uses SQLite for development and is structured to allow future extensions such as KYC and receipt generation.
- **`kryptera_front/`**: The React + TypeScript frontend built with Vite. It features a custom design system with a bright green accent (`#9fe870`), providing a friendly and approachable user experience. 

Other key files in the root directory:
- **`DESIGN.md`**: Outlines the visual theme, color palette, typography, and component styling guidelines.
- **`plan.md`**: Details the feature extension plan, backend data model updates, REST API design, and future frontend steps.

## Getting Started

To run the application locally, you'll need to start both the backend and frontend servers in separate terminal windows.

### Backend Setup (`kryptera_back`)

1. Navigate to the backend directory: `cd kryptera_back`
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```
3. Install dependencies: `pip install -r requirements.txt`
4. Set up your environment variables (e.g., `cp .env.example .env`)
5. Apply migrations and seed data: 
   ```bash
   python manage.py migrate
   python manage.py seed
   ```
6. Run the server: `python manage.py runserver` (runs on `http://localhost:8000`)

For detailed API documentation and endpoints, see [kryptera_back/README.md](kryptera_back/README.md).

### Frontend Setup (`kryptera_front`)

1. Navigate to the frontend directory: `cd kryptera_front`
2. Install dependencies: `npm install`
3. Start the Vite development server: `npm run dev` (runs on `http://localhost:5173`)

For details on the design system, available components, and development guidelines, see [kryptera_front/README.md](kryptera_front/README.md).

