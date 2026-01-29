from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from datetime import datetime, date
import random
import os
from database import db, init_db
from models import Task, ScheduleEntry

app = Flask(__name__)

# Ensure data directory exists
data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
os.makedirs(data_dir, exist_ok=True)

app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(data_dir, "scheduler.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
CORS(app)

# Initialize database
init_db(app)

# Color palette for tasks
COLOR_PALETTE = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#74B9FF', '#A29BFE', '#FD79A8',
    '#FDCB6E', '#6C5CE7', '#00B894', '#2C3E50'  # Last one is free time
]

def get_random_color():
    """Get a random color from the palette"""
    return random.choice(COLOR_PALETTE)

# Routes
@app.route('/')
def index():
    return render_template('index.html')

# Task API Endpoints
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Get all tasks, optionally filtered by template_id"""
    template_id = request.args.get('template_id', type=int)

    if template_id:
        tasks = Task.query.filter_by(template_id=template_id).order_by(Task.order_index).all()
    else:
        tasks = Task.query.order_by(Task.order_index).all()

    return jsonify([task.to_dict() for task in tasks])

@app.route('/api/tasks', methods=['POST'])
def create_task():
    """Create a new task"""
    data = request.json

    if not data.get('name') or not data.get('duration'):
        return jsonify({'error': 'Name and duration are required'}), 400

    task = Task(
        name=data['name'],
        duration=data['duration'],
        color=data.get('color', get_random_color()),
        start_time=data.get('start_time'),
        order_index=data.get('order_index', 0),
        template_id=data.get('template_id', 1)
    )

    db.session.add(task)
    db.session.commit()

    return jsonify(task.to_dict()), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    """Update a task"""
    task = Task.query.get_or_404(task_id)
    data = request.json

    if 'name' in data:
        task.name = data['name']
    if 'duration' in data:
        task.duration = data['duration']
    if 'color' in data:
        task.color = data['color']
    if 'start_time' in data:
        task.start_time = data['start_time']
    if 'order_index' in data:
        task.order_index = data['order_index']

    task.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify(task.to_dict())

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """Delete a task"""
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()

    return jsonify({'message': 'Task deleted successfully'})

# Schedule Entry API Endpoints
@app.route('/api/schedule', methods=['GET'])
def get_schedule():
    """Get schedule entries for today"""
    today = date.today()
    entries = ScheduleEntry.query.filter_by(date=today).order_by(ScheduleEntry.start_time).all()
    return jsonify([entry.to_dict() for entry in entries])

@app.route('/api/schedule', methods=['POST'])
def create_schedule_entry():
    """Create a new schedule entry"""
    data = request.json

    if not data.get('name') or not data.get('duration') or not data.get('start_time'):
        return jsonify({'error': 'Name, duration, and start_time are required'}), 400

    entry = ScheduleEntry(
        task_id=data.get('task_id'),
        name=data['name'],
        duration=data['duration'],
        start_time=data['start_time'],
        color=data.get('color', get_random_color()),
        date=date.today()
    )

    db.session.add(entry)
    db.session.commit()

    return jsonify(entry.to_dict()), 201

@app.route('/api/schedule/<int:entry_id>', methods=['PUT'])
def update_schedule_entry(entry_id):
    """Update a schedule entry"""
    entry = ScheduleEntry.query.get_or_404(entry_id)
    data = request.json

    if 'name' in data:
        entry.name = data['name']
    if 'duration' in data:
        entry.duration = data['duration']
    if 'start_time' in data:
        entry.start_time = data['start_time']
    if 'color' in data:
        entry.color = data['color']
    if 'task_id' in data:
        entry.task_id = data['task_id']
    if 'completed' in data:
        entry.completed = data['completed']

    entry.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify(entry.to_dict())

@app.route('/api/schedule/<int:entry_id>', methods=['DELETE'])
def delete_schedule_entry(entry_id):
    """Delete a schedule entry"""
    entry = ScheduleEntry.query.get_or_404(entry_id)
    db.session.delete(entry)
    db.session.commit()

    return jsonify({'message': 'Schedule entry deleted successfully'})

@app.route('/api/schedule/sync', methods=['POST'])
def sync_schedule():
    """Sync tasks from optimal schedule to daily schedule"""
    data = request.json or {}
    template_id = data.get('template_id', 1)

    # Delete existing entries for today
    today = date.today()
    ScheduleEntry.query.filter_by(date=today).delete()

    # Get all tasks for the specified template ordered by their position
    tasks = Task.query.filter_by(template_id=template_id).order_by(Task.order_index).all()

    # Create schedule entries from tasks
    for task in tasks:
        entry = ScheduleEntry(
            task_id=task.id,
            name=task.name,
            duration=task.duration,
            start_time=task.start_time if task.start_time else '09:00',
            color=task.color,
            date=today,
            completed=False
        )
        db.session.add(entry)

    db.session.commit()

    # Return the new schedule
    entries = ScheduleEntry.query.filter_by(date=today).order_by(ScheduleEntry.start_time).all()
    return jsonify([entry.to_dict() for entry in entries])

@app.route('/api/templates', methods=['GET'])
def get_templates():
    """Get list of all templates with task counts"""
    templates = []
    for i in range(1, 9):  # 8 templates
        count = Task.query.filter_by(template_id=i).count()
        templates.append({
            'id': i,
            'name': f'Schedule {i}',
            'task_count': count
        })
    return jsonify(templates)

@app.route('/api/sunset', methods=['GET'])
def get_sunset():
    """Get sunset, sunrise, and prayer times for given coordinates"""
    import requests

    lat = request.args.get('lat')
    lng = request.args.get('lng')

    if not lat or not lng:
        return jsonify({'error': 'Latitude and longitude are required'}), 400

    try:
        # Call sunrise-sunset.org API
        response = requests.get(
            'https://api.sunrise-sunset.org/json',
            params={'lat': lat, 'lng': lng, 'formatted': 0}
        )
        data = response.json()

        if data['status'] != 'OK':
            return jsonify({'error': 'Failed to fetch sunset time'}), 500

        sunset_utc = data['results']['sunset']
        sunrise_utc = data['results']['sunrise']
        # Parse sunset and sunrise times
        from datetime import datetime
        sunset_dt = datetime.fromisoformat(sunset_utc.replace('Z', '+00:00'))
        sunrise_dt = datetime.fromisoformat(sunrise_utc.replace('Z', '+00:00'))

        # Fetch prayer times from Aladhan API
        prayer_response = requests.get(
            'https://api.aladhan.com/v1/timings',
            params={
                'latitude': lat,
                'longitude': lng,
                'method': 2  # ISNA method
            }
        )
        prayer_data = prayer_response.json()

        result = {
            'sunset': sunset_dt.isoformat(),
            'sunset_time': sunset_dt.strftime('%H:%M'),
            'sunrise': sunrise_dt.isoformat(),
            'sunrise_time': sunrise_dt.strftime('%H:%M'),
            'lat': lat,
            'lng': lng
        }

        # Add prayer times if available
        if prayer_data.get('code') == 200 and prayer_data.get('data'):
            timings = prayer_data['data']['timings']
            # Convert prayer times to local time
            for prayer in ['Dhuhr', 'Asr', 'Isha']:
                if prayer in timings:
                    # Prayer times from API are in HH:MM format
                    prayer_time = timings[prayer].split(' ')[0]  # Remove timezone suffix if present
                    result[prayer.lower() + '_time'] = prayer_time

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Get port from environment variable (Render sets this) or default to 5001
    port = int(os.environ.get('PORT', 5001))
    # Get debug mode from environment variable or default to False
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
