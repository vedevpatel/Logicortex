from pydantic import BaseModel

class GitHubInstallation(BaseModel):
    installation_id: int