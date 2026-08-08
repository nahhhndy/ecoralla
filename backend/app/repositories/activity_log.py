"""ActivityLogRepository for activity log database access."""
from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.activity_log import ActivityLog
from backend.app.repositories.base import BaseRepository


class ActivityLogRepository(BaseRepository[ActivityLog]):
    def __init__(self, db: AsyncSession):
        super().__init__(ActivityLog, db)

    async def log(
        self,
        action: str,
        user_id: str | None = None,
        metadata: dict | None = None,
        ip_address: str | None = None,
    ) -> ActivityLog:
        return await self.create(
            action=action,
            user_id=user_id,
            metadata_=metadata,
            ip_address=ip_address,
        )

    async def get_user_logs(self, user_id: str, limit: int = 50) -> list[ActivityLog]:
        result = await self.db.execute(
            select(ActivityLog)
            .where(ActivityLog.user_id == user_id)
            .order_by(desc(ActivityLog.created_at))
            .limit(limit)
        )
        return list(result.scalars().all())
