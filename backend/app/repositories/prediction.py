"""PredictionRepository for prediction history, stats, and trend aggregation."""
from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.prediction import Prediction
from backend.app.repositories.base import BaseRepository


class PredictionRepository(BaseRepository[Prediction]):
    def __init__(self, db: AsyncSession):
        super().__init__(Prediction, db)

    async def get_user_history(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Prediction], int]:
        offset = (page - 1) * page_size

        total_result = await self.db.execute(
            select(func.count())
            .select_from(Prediction)
            .where(Prediction.user_id == user_id)
        )
        total = total_result.scalar_one()

        result = await self.db.execute(
            select(Prediction)
            .where(Prediction.user_id == user_id)
            .order_by(desc(Prediction.created_at))
            .offset(offset)
            .limit(page_size)
        )
        items = list(result.scalars().all())
        return items, total

    async def get_user_stats(self, user_id: str) -> dict[str, Any]:
        tot_res = await self.db.execute(
            select(func.count())
            .select_from(Prediction)
            .where(Prediction.user_id == user_id)
        )
        total = tot_res.scalar_one() or 0

        hr_res = await self.db.execute(
            select(func.count())
            .select_from(Prediction)
            .where(
                and_(Prediction.user_id == user_id, Prediction.prediction == 1)
            )
        )
        high_risk = hr_res.scalar_one() or 0

        avg_res = await self.db.execute(
            select(
                func.avg(Prediction.confidence).label("avg_confidence"),
                func.avg(Prediction.probability).label("avg_probability"),
            ).where(Prediction.user_id == user_id)
        )
        avg_row = avg_res.one()

        return {
            "total": total,
            "high_risk": high_risk,
            "low_risk": total - high_risk,
            "avg_confidence": float(avg_row.avg_confidence or 0.0),
            "avg_probability": float(avg_row.avg_probability or 0.0),
        }

    async def get_trend_data(
        self,
        user_id: str,
        days: int = 30,
    ) -> list[dict[str, Any]]:
        since = datetime.now(UTC) - timedelta(days=days)
        result = await self.db.execute(
            select(Prediction)
            .where(
                and_(
                    Prediction.user_id == user_id,
                    Prediction.created_at >= since,
                )
            )
            .order_by(Prediction.created_at)
        )
        predictions = list(result.scalars().all())

        daily: dict[str, dict[str, Any]] = defaultdict(
            lambda: {"total": 0, "high": 0, "confidences": []}
        )
        for p in predictions:
            date_str = p.created_at.strftime("%Y-%m-%d")
            daily[date_str]["total"] += 1
            if p.prediction == 1:
                daily[date_str]["high"] += 1
            daily[date_str]["confidences"].append(p.confidence)

        res = []
        for date_key, data in sorted(daily.items()):
            confs = data["confidences"]
            avg_c = sum(confs) / len(confs) if confs else 0.0
            res.append(
                {
                    "date": date_key,
                    "total": data["total"],
                    "high_risk": data["high"],
                    "low_risk": data["total"] - data["high"],
                    "avg_confidence": avg_c,
                }
            )
        return res
