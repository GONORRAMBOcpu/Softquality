from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/projects", tags=["Projects"])

class ProjectCreate(BaseModel):
    name: str
    version_tag: str

@router.post("/")
async def upload_project(
    name: str = Form(...),
    version_tag: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    return {
        "status": "success",
        "message": "Proyecto registrado",
        "project_id": 1,
        "version_id": 101,
        "version_tag": version_tag
    }

@router.post("/{project_id}/versions/{version_id}/review")
async def request_review(
    project_id: int, 
    version_id: int, 
    background_tasks: BackgroundTasks
):
    background_tasks.add_task(run_analysis_pipeline, project_id, version_id)
    return {
        "status": "processing",
        "message": "Revision en proceso"
    }

def run_analysis_pipeline(project_id: int, version_id: int):
    pass
