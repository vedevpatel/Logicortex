import os
import subprocess
import tempfile
import asyncio
import google.generativeai as genai

from app.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.models import Scan, Organization
from app.api.endpoints.github import get_installation_access_token
from app.core.config import settings

# Configure the Gemini API client
genai.configure(api_key=settings.GOOGLE_API_KEY)


@celery_app.task(bind=True)
def run_scan(self, scan_id: int):
    """
    The main background task to run a security scan.
    Step 1: Clones the repository.
    Step 2: Analyzes code with Gemini to find business logic rules.
    """
    print(f"WORKER: Received scan ID: {scan_id}")
    db = SessionLocal()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            print(f"WORKER: Scan {scan_id} not found.")
            return "Scan not found."

        organization = (
            db.query(Organization)
            .filter(Organization.id == scan.organization_id)
            .first()
        )
        if not organization or not organization.github_installation_id:
            raise Exception("Organization or GitHub installation not found.")

        scan.status = "in_progress"
        db.commit()
        print(f"WORKER: Scan {scan_id} status updated to in_progress.")

        # Step 1: Code Retrieval
        print(f"WORKER: Authenticating with GitHub to access {scan.repository_name}...")
        token = asyncio.run(get_installation_access_token(organization.github_installation_id))
        clone_url = f"https://x-access-token:{token}@github.com/{scan.repository_name}.git"

        analysis_result = None
        with tempfile.TemporaryDirectory() as tmpdir:
            print(f"WORKER: Cloning repository into temporary directory: {tmpdir}")
            process = subprocess.run(
                ["git", "clone", "--depth", "1", clone_url, tmpdir],
                capture_output=True,
                text=True,
            )

            if process.returncode != 0:
                print(f"WORKER: Git clone failed. Error: {process.stderr}")
                raise Exception(f"Git clone failed: {process.stderr}")

            print(f"WORKER: Successfully cloned {scan.repository_name}.")

            # Step 2: Neural Analysis with Gemini
            print(f"WORKER: Searching for largest Python file to analyze...")
            python_files = []
            for root, _, files in os.walk(tmpdir):
                for file in files:
                    if file.endswith(".py"):
                        if file == "__init__.py":
                            continue  # skip trivial init files
                        path = os.path.join(root, file)
                        try:
                            size = os.path.getsize(path)
                            if size > 100:  # ignore very tiny files
                                python_files.append((path, size))
                        except OSError:
                            continue

            if not python_files:
                raise Exception("No suitable Python files found in the repository to analyze.")

            # Pick the largest file (more likely to have core logic)
            target_file_path = max(python_files, key=lambda item: item[1])[0]

            print(f"WORKER: Analyzing file: {os.path.relpath(target_file_path, tmpdir)}")
            with open(target_file_path, "r", errors="ignore") as f:
                file_content = f.read()

            # Construct the prompt for Gemini
            prompt = f"""
            You are an expert application security analyst. Your task is to analyze the following Python source code and identify business logic rules related to user roles and permissions.

            Analyze this code:
            ```python
            {file_content}
            ```

            Based on the code, generate a JSON object containing a list of functions and the probable user role required to access them (e.g., 'admin', 'member', 'public'). If a function has no clear role, use 'unknown'.

            Example JSON format:
            {{
              "analysis": [
                {{ "function_name": "example_function", "required_role": "admin" }}
              ]
            }}

            Return ONLY the JSON object.
            """

            # Use the correct, modern Gemini model
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)

            cleaned_response = (
                response.text.strip()
                .replace("```json", "")
                .replace("```", "")
            )

            analysis_result = {
                "file_analyzed": os.path.relpath(target_file_path, tmpdir),
                "gemini_analysis": cleaned_response,
            }
            print(f"WORKER: Gemini analysis complete.")

        # Step 3: Save Results
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        scan.status = "completed"
        scan.results = analysis_result
        db.commit()
        print(f"WORKER: Scan {scan_id} status updated to completed and results saved.")

        return "Scan completed successfully."

    except Exception as e:
        db.rollback()
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            scan.status = "failed"
            scan.results = {"error": str(e)}
            db.commit()
        print(f"WORKER: An error occurred during scan {scan_id}: {e}")
        self.retry(exc=e, countdown=60)
    finally:
        db.close()