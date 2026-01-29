#!/usr/bin/env python3
"""
Simple database migration script to add completed column
"""
from app import app, db
from sqlalchemy import text

def migrate():
    with app.app_context():
        try:
            # Try to add the completed column if it doesn't exist
            with db.engine.connect() as conn:
                conn.execute(text(
                    "ALTER TABLE schedule_entries ADD COLUMN completed BOOLEAN DEFAULT 0"
                ))
                conn.commit()
                print("✓ Successfully added 'completed' column to schedule_entries table")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("✓ Column 'completed' already exists, skipping migration")
            else:
                print(f"✗ Migration failed: {e}")
                raise

if __name__ == '__main__':
    migrate()
