from datetime import datetime
from database import db

class Task(db.Model):
    """Optimal Schedule Task (Left Panel)"""
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    duration = db.Column(db.Integer, nullable=False)  # minutes
    color = db.Column(db.String(7), nullable=False)  # hex color
    start_time = db.Column(db.String(5), nullable=True)  # HH:MM format
    order_index = db.Column(db.Integer, default=0)
    template_id = db.Column(db.Integer, default=1)  # which optimal schedule template (1-8)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'duration': self.duration,
            'color': self.color,
            'start_time': self.start_time,
            'order_index': self.order_index,
            'template_id': self.template_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ScheduleEntry(db.Model):
    """Daily Schedule Entry (Right Panel)"""
    __tablename__ = 'schedule_entries'

    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=True)
    name = db.Column(db.String(100), nullable=False)
    duration = db.Column(db.Integer, nullable=False)  # minutes
    start_time = db.Column(db.String(5), nullable=False)  # HH:MM format
    color = db.Column(db.String(7), nullable=False)  # hex color
    date = db.Column(db.Date, default=datetime.utcnow().date)
    completed = db.Column(db.Boolean, default=False)  # completion status
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    task = db.relationship('Task', backref='schedule_entries')

    def to_dict(self):
        return {
            'id': self.id,
            'task_id': self.task_id,
            'name': self.name,
            'duration': self.duration,
            'start_time': self.start_time,
            'color': self.color,
            'date': self.date.isoformat() if self.date else None,
            'completed': self.completed,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
