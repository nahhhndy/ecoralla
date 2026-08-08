"""ReportRepository for report database access."""
from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.report import Report
from backend.app.repositories.base import BaseRepository


class ReportRepository(BaseRepository[Report]):
    def __init__(self, db: AsyncSession):
        super().__init__(Report, db)

    async def get_user_reports(self, user_id: str) -> list[Report]:
        result = await self.db.execute(
            select(Report)
            .where(Report.user_id == user_id)
            .order_by(desc(Report.created_at))
        )
        return list(result.scalars().all())
