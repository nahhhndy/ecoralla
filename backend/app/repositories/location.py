"""LocationRepository for location database access."""
from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.location import Location
from backend.app.repositories.base import BaseRepository


class LocationRepository(BaseRepository[Location]):
    def __init__(self, db: AsyncSession):
        super().__init__(Location, db)

    async def get_user_locations(self, user_id: str) -> list[Location]:
        result = await self.db.execute(
            select(Location)
            .where(Location.user_id == user_id)
            .order_by(desc(Location.created_at))
        )
        return list(result.scalars().all())
