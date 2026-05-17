from __future__ import annotations

"""تهيئة بيانات تجريبية: python -m scripts.seed"""

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.category import Category
from app.models.enums import EntityStatus, UserRole
from app.models.product import Product
from app.models.user import User
from app.models.venue import Venue


def main() -> None:
    db = SessionLocal()
    try:
        venue = db.query(Venue).filter(Venue.slug == "demo-cafe").first()
        if not venue:
            venue = Venue(name="مقهى تجريبي", slug="demo-cafe")
            db.add(venue)
            db.flush()

        user = db.query(User).filter(User.email == "owner@meez.app").first()
        if not user:
            user = User(
                venue_id=venue.id,
                name="مالك تجريبي",
                email="owner@meez.app",
                hashed_password=hash_password("MeezOwner2026!"),
                role=UserRole.owner,
            )
            db.add(user)

        if not db.query(Category).filter(Category.venue_id == venue.id).first():
            cat = Category(venue_id=venue.id, name="مشروبات", slug="drinks", icon="☕")
            db.add(cat)
            db.flush()
            db.add(
                Product(
                    venue_id=venue.id,
                    name="لاتيه",
                    description="قهوة مع حليب",
                    price=18,
                    category_id=cat.id,
                    calories=120,
                    status=EntityStatus.active,
                )
            )

        db.commit()
        print("Seed OK — owner@meez.app / MeezOwner2026!")
    finally:
        db.close()


if __name__ == "__main__":
    main()
