"""Research Workspace API router."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.dependencies import get_db, get_current_user
from backend.app.models.user import User
from backend.app.services.workspace import (
    CreateExperimentSchema,
    CreateNoteSchema,
    CreateProjectSchema,
    WorkspaceService,
)

router = APIRouter()


@router.get("/projects")
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = WorkspaceService(db)
    return await svc.list_user_projects(current_user.id)


@router.post("/projects", status_code=status.HTTP_201_CREATED)
async def create_project(
    data: CreateProjectSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = WorkspaceService(db)
    return await svc.create_project(current_user.id, data)


@router.get("/projects/{project_id}")
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = WorkspaceService(db)
    project = await svc.get_project_by_id(project_id, current_user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/projects/{project_id}/notes", status_code=status.HTTP_201_CREATED)
async def add_note(
    project_id: str,
    data: CreateNoteSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = WorkspaceService(db)
    author_name = current_user.full_name or "Researcher"
    return await svc.add_note(project_id, current_user.id, author_name, data.content)


@router.post("/projects/{project_id}/experiments", status_code=status.HTTP_201_CREATED)
async def add_experiment(
    project_id: str,
    data: CreateExperimentSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = WorkspaceService(db)
    return await svc.add_experiment(project_id, data)


@router.get("/projects/{project_id}/export-dataset")
async def export_dataset(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = WorkspaceService(db)
    try:
        csv_data = await svc.export_project_dataset_csv(project_id, current_user.id)
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=project_{project_id}_dataset.csv"},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = WorkspaceService(db)
    success = await svc.delete_project(project_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/projects/{project_id}/experiments/{experiment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_experiment(
    project_id: str,
    experiment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = WorkspaceService(db)
    success = await svc.delete_experiment(project_id, experiment_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Experiment record not found"
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)

