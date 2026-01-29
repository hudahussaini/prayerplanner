#!/usr/bin/env python3
"""
Database migration script to add template_id column
"""
from app import app, db
from sqlalchemy import text

def migrate():
    with app.app_context():
        try:
            # Try to add the template_id column if it doesn't exist
            with db.engine.connect() as conn:
                conn.execute(text(
                    "ALTER TABLE tasks ADD COLUMN template_id INTEGER DEFAULT 1"
                ))
                conn.commit()
                print("✓ Successfully added 'template_id' column to tasks table")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("✓ Column 'template_id' already exists, skipping migration")
            else:
                print(f"✗ Migration failed: {e}")
                raise

if __name__ == '__main__':
    migrate()
