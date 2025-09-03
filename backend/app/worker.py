import time
from app.celery_app import celery_app
from app.db.session import SessionLocal
from app.db.models.scan import Scan

@celery_app.task
def run_scan(scan_id: int):
    """
    A placeholder background task that simulates a code scan.
    """
    db = SessionLocal()
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if not scan:
            return "Scan not found."

        # 1. Update status to 'in_progress'
        scan.status = "in_progress"
        db.commit()

        # 2. Simulate a long-running analysis
        print(f"Starting analysis for scan ID: {scan_id} on repo {scan.repository_name}...")
        time.sleep(30) # Simulate 30 seconds of work
        print(f"Analysis finished for scan ID: {scan_id}.")

        # 3. Update status to 'completed' and add placeholder results
        scan.status = "completed"
        scan.results = {"vulnerabilities_found": 0, "report_summary": "No critical issues found."}
        db.commit()
        
        return "Scan completed successfully."
    finally:
        db.close()