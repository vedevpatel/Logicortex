# Logicortex 🧠
<img width="1754" height="1754" alt="Logicortex" src="https://github.com/user-attachments/assets/15323f6e-c25f-493c-a3b7-6363914bf04f" />
Welcome to the official repository for Logicortex, an autonomous application security platform designed to find and fix complex business logic vulnerabilities.

## 📜 About The Project


Logicortex operates as an active, intelligent partner within the software development lifecycle. Instead of just matching known bad patterns, it uses a team of specialized AI agents to understand the intended behavior of an application's code and then identify, fix, and even predict any actions that would violate that intent.

---

## 🛠️ Technology Stack

* **Frontend**: React (Next.js) with TypeScript
* **Backend**: Python with FastAPI
* **Database**: PostgreSQL
* **Async Tasks**: Celery with Redis
* **AI Models**: TBD
* **Symbolic Engine**: Microsoft Z3 SMT Solver
* **Infrastructure**: Docker

---

## 🚀 Getting Started

This project is fully containerized. To get the development environment running, follow these steps:

1.  **Prerequisites**:
    * Docker and Docker Compose must be installed.
    * An IDE like VS Code is recommended.

2.  **Clone the repository**:
    ```sh
    git clone [https://github.com/YourUsername/logicortex.git]
    cd logicortex
    ```

3.  **Launch the environment**:
    ```sh
    docker-compose up --build
    ```

4.  **Access the services**:
    * **Frontend**: `http://localhost:3000`
    * **Backend API**: `http://localhost:8000`
