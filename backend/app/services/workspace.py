"""Research Workspace Service layer handling projects, notes, experiments, and dataset exports."""
from __future__ import annotations

import csv
import io
import json
import logging
from typing import Any
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.prediction import Prediction
from backend.app.models.workspace import ExperimentRecord, ResearchNote, ResearchProject

logger = logging.getLogger(__name__)


class CreateProjectSchema(BaseModel):
    title: str
    description: str | None = None
    tags: str | None = None
    is_collaborative: bool = True


class CreateNoteSchema(BaseModel):
    content: str


class CreateExperimentSchema(BaseModel):
    title: str
    latitude: float
    longitude: float
    sea_surface_temperature: float
    prediction: int
    probability: float
    confidence: float
    notes: str | None = None


class WorkspaceService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_user_projects(self, user_id: str) -> list[ResearchProject]:
        stmt = (
            select(ResearchProject)
            .where(ResearchProject.user_id == user_id)
            .options(
                selectinload(ResearchProject.notes),
                selectinload(ResearchProject.experiments),
            )
            .order_by(ResearchProject.created_at.desc())
        )
        res = await self.db.execute(stmt)
        projects = list(res.scalars().all())

        if not projects:
            logger.info("Auto-seeding default ResearchProject for user %s", user_id)
            default_proj = ResearchProject(
                user_id=user_id,
                title="EcoRal Environmental Investigation",
                description="Primary research project for monitoring coral bleaching telemetry and sea surface temperature anomalies.",
                tags="coral-bleaching, sst-telemetry",
                is_collaborative=True,
            )
            self.db.add(default_proj)
            await self.db.commit()
            await self.db.refresh(default_proj)

            exp1 = ExperimentRecord(
                project_id=default_proj.id,
                title="Camarines Sur, Bicol Region",
                latitude=13.6217,
                longitude=123.1948,
                sea_surface_temperature=29.4,
                prediction=1,
                probability=0.602,
                confidence=0.602,
                notes="Thermal anomaly sector observation",
            )
            exp2 = ExperimentRecord(
                project_id=default_proj.id,
                title="Quezon, Calabarzon",
                latitude=14.0,
                longitude=121.5,
                sea_surface_temperature=28.1,
                prediction=0,
                probability=0.193,
                confidence=0.807,
                notes="Baseline SST monitoring",
            )
            exp3 = ExperimentRecord(
                project_id=default_proj.id,
                title="Quezon, Calabarzon",
                latitude=14.0,
                longitude=121.5,
                sea_surface_temperature=28.2,
                prediction=0,
                probability=0.201,
                confidence=0.799,
                notes="Secondary baseline check",
            )
            exp4 = ExperimentRecord(
                project_id=default_proj.id,
                title="Quezon, Calabarzon",
                latitude=14.0,
                longitude=121.5,
                sea_surface_temperature=28.3,
                prediction=0,
                probability=0.210,
                confidence=0.790,
                notes="Tertiary baseline check",
            )
            self.db.add_all([exp1, exp2, exp3, exp4])
            await self.db.commit()

            # Re-fetch project with loaded relationships
            stmt = (
                select(ResearchProject)
                .where(ResearchProject.id == default_proj.id)
                .options(
                    selectinload(ResearchProject.notes),
                    selectinload(ResearchProject.experiments),
                )
            )
            res = await self.db.execute(stmt)
            return [res.scalar_one()]

        return projects

    async def create_project(self, user_id: str, data: CreateProjectSchema) -> ResearchProject:
        project = ResearchProject(
            user_id=user_id,
            title=data.title,
            description=data.description,
            tags=data.tags,
            is_collaborative=data.is_collaborative,
        )
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def get_project_by_id(self, project_id: str, user_id: str) -> ResearchProject | None:
        stmt = (
            select(ResearchProject)
            .where(ResearchProject.id == project_id)
            .options(
                selectinload(ResearchProject.notes),
                selectinload(ResearchProject.experiments),
            )
        )
        res = await self.db.execute(stmt)
        project = res.scalar_one_or_none()
        if not project:
            return None
        # Enforce server-side ownership or collaborative read access
        if project.user_id != user_id and not project.is_collaborative:
            return None
        return project

    async def add_note(self, project_id: str, user_id: str, author_name: str, content: str) -> ResearchNote:
        note = ResearchNote(
            project_id=project_id,
            user_id=user_id,
            author_name=author_name,
            content=content,
        )
        self.db.add(note)
        await self.db.commit()
        await self.db.refresh(note)
        return note

    async def add_experiment(self, project_id: str, data: CreateExperimentSchema) -> ExperimentRecord:
        exp = ExperimentRecord(
            project_id=project_id,
            title=data.title,
            latitude=data.latitude,
            longitude=data.longitude,
            sea_surface_temperature=data.sea_surface_temperature,
            prediction=data.prediction,
            probability=data.probability,
            confidence=data.confidence,
            notes=data.notes,
        )
        self.db.add(exp)
        await self.db.commit()
        await self.db.refresh(exp)
        return exp

    async def export_project_dataset_csv(self, project_id: str, user_id: str) -> str:
        project = await self.get_project_by_id(project_id, user_id)
        if not project:
            raise ValueError("Project not found")

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            ["Experiment ID", "Title", "Latitude", "Longitude", "SST (°C)", "Prediction", "Probability", "Confidence", "Notes", "Created At"]
        )

        for exp in project.experiments:
            writer.writerow(
                [
                    exp.id,
                    exp.title,
                    exp.latitude,
                    exp.longitude,
                    exp.sea_surface_temperature,
                    "High Risk" if exp.prediction == 1 else "Low Vulnerability",
                    f"{exp.probability * 100:.1f}%",
                    f"{exp.confidence * 100:.1f}%",
                    exp.notes or "",
                    exp.created_at.strftime("%Y-%m-%d %H:%M UTC"),
                ]
            )

        return output.getvalue()

    async def delete_project(self, project_id: str, user_id: str) -> bool:
        logger.info("Deleting workspace project project_id=%s user_id=%s", project_id, user_id)
        stmt = select(ResearchProject).where(ResearchProject.id == project_id, ResearchProject.user_id == user_id)
        res = await self.db.execute(stmt)
        project = res.scalar_one_or_none()
        if not project:
            return False
        await self.db.delete(project)
        await self.db.commit()
        return True

    async def delete_experiment(self, project_id: str, experiment_id: str, user_id: str) -> bool:
        logger.info(
            "Deleting workspace experiment project=%s experiment=%s user=%s",
            project_id,
            experiment_id,
            user_id,
        )

        # Enforce server-side ownership check on project
        stmt_proj = select(ResearchProject).where(ResearchProject.id == project_id, ResearchProject.user_id == user_id)
        res_proj = await self.db.execute(stmt_proj)
        project = res_proj.scalar_one_or_none()
        if not project:
            logger.warning("delete_experiment: Project %s not found or not owned by user %s", project_id, user_id)
            return False

        # Find specific experiment record
        stmt_exp = select(ExperimentRecord).where(
            ExperimentRecord.id == experiment_id,
            ExperimentRecord.project_id == project_id,
        )
        res_exp = await self.db.execute(stmt_exp)
        exp = res_exp.scalar_one_or_none()
        if not exp:
            logger.warning("delete_experiment: Experiment %s not found in project %s", experiment_id, project_id)
            return False

        # Check for matching prediction in prediction history and clean up
        stmt_pred = select(Prediction).where(
            Prediction.user_id == user_id,
            Prediction.latitude == exp.latitude,
            Prediction.longitude == exp.longitude,
            Prediction.sea_surface_temperature == exp.sea_surface_temperature,
        ).limit(1)
        res_pred = await self.db.execute(stmt_pred)
        pred_match = res_pred.scalar_one_or_none()
        if pred_match:
            await self.db.delete(pred_match)

        await self.db.delete(exp)
        await self.db.commit()
        logger.info("Successfully deleted experiment %s from project %s", experiment_id, project_id)
        return True
