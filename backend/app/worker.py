import time
import subprocess
import tempfile
import shutil
from app.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.models import Scan, Organization
from app.api.endpoints.github import get_installation_access_token
import asyncio

@celery_app.task(bind=True)
def run_scan(self, scan_id: int):
    """
    The main background task to run a security scan.
    Step 1: Clones the repository.
    """
    print(f"WORKER: Received scan ID: {scan_id}")
    db = SessionLocal()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            print(f"WORKER: Scan {scan_id} not found.")
            return "Scan not found."

        organization = db.query(Organization).filter(Organization.id == scan.organization_id).first()
        if not organization or not organization.github_installation_id:
            raise Exception("Organization or GitHub installation not found.")

        scan.status = "in_progress"
        db.commit()
        print(f"WORKER: Scan {scan_id} status updated to in_progress.")

        # CODE RETRIEVAL ---
        repo_full_name = scan.repository_name
        installation_id = organization.github_installation_id
        
        print(f"WORKER: Authenticating with GitHub to access {repo_full_name}...")
        
        # We must run our async helper in a sync context (Celery worker)
        token = asyncio.run(get_installation_access_token(installation_id))
        
        clone_url = f"https://x-access-token:{token}@github.com/{repo_full_name}.git"

        # Create a temporary directory to clone the repo into
        with tempfile.TemporaryDirectory() as tmpdir:
            print(f"WORKER: Cloning repository into temporary directory: {tmpdir}")
            
            # Run the git clone command
            process = subprocess.run(
                ["git", "clone", "--depth", "1", clone_url, tmpdir],
                capture_output=True, text=True
            )
            
            if process.returncode != 0:
                print(f"WORKER: Git clone failed. Error: {process.stderr}")
                raise Exception(f"Git clone failed: {process.stderr}")

            print(f"WORKER: Successfully cloned {repo_full_name}.")
            
            #
            # FUTURE STEPS 
            # Step 2: Read files from tmpdir and send to Gemini
            # Step 3: Analyze results with Z3
            #
            time.sleep(5) # Placeholder for future analysis

        # Re-fetch the scan object to ensure the session is fresh before final update
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        scan.status = "completed"
        scan.results = {"clone_status": "success", "summary": "Code retrieval successful. Ready for analysis."}
        db.commit()
        print(f"WORKER: Scan {scan_id} status updated to completed.")
        
        return "Scan completed successfully."
    except Exception as e:
        db.rollback()
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            scan.status = 'failed'
            scan.results = {"error": str(e)}
            db.commit()
        print(f"WORKER: An error occurred during scan {scan_id}: {e}")
        self.retry(exc=e, countdown=60)
    finally:
        db.close()