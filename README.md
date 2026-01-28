# Flask Daily Schedule Application

A Flask-based web application for managing optimal schedules and daily task planning with drag-and-drop functionality.

## Features

- **Two-Panel Layout**: Optimal schedule template (left) and daily schedule (right)
- **Sunset-Based Timeline**: Timeline starts at sunset time based on your location (updates daily)
- **Islamic Prayer Times**: Visual markers for Sunrise, Dhuhr, Asr, Sunset, and Isha
- **Location Aware**: Automatically detects your location to calculate accurate prayer and sun times
- **Drag & Drop**: Move tasks between panels and adjust timing with 15-minute snapping
- **Sync Functionality**: Copy your optimal schedule to today's schedule
- **Visual Timeline**: 24-hour timeline with hour markers (starting from sunset)
- **Color-Coded Tasks**: Automatically assigned colors for easy visualization
- **Persistent Storage**: SQLite database for data persistence

## Installation

### Local Development

1. Install dependencies:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. Run the application:
```bash
export FLASK_DEBUG=true
python app.py
```

3. Open your browser and navigate to:
```
http://localhost:5001
```

### Deploy to Render

1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render will automatically detect the `render.yaml` configuration
6. Click "Create Web Service"
7. Your app will be deployed at `https://your-app-name.onrender.com`

**Note**: The free tier on Render will spin down after inactivity, so the first request may take 30-60 seconds to wake up.

## Usage

### Location Permission
When you first open the app, it will request permission to access your location. This is used to:
- Calculate accurate Islamic prayer times (Dhuhr, Asr, Isha) for your area
- Calculate sunset and sunrise times
- Display prayer time markers on the timeline
- Update the timeline to start at sunset each day
- Cache all prayer times (refreshed daily)

If you deny location permission, the app will use default times.

The timeline displays color-coded prayer time markers:
- 🌅 **Sunrise** (Orange) - Fajr prayer ends
- ☀️ **Dhuhr** (Gold) - Noon prayer
- 🌤️ **Asr** (Amber) - Afternoon prayer
- 🌇 **Sunset** (Timeline start) - Maghrib prayer
- 🌙 **Isha** (Blue) - Evening prayer

### Adding Tasks (Optimal Schedule)
1. Click "+ Add Task" in the left panel
2. Enter task name and duration (in minutes)
3. Click "Save"

### Moving Tasks
- Drag task blocks up or down to change their start time
- Tasks snap to 15-minute intervals
- Drag tasks from optimal schedule to daily schedule to create entries

### Syncing Schedule
1. Set up your optimal schedule in the left panel
2. Click "Sync from Optimal" in the right panel
3. Your optimal schedule will be copied to today's schedule

### Deleting Tasks
- Hover over a task block
- Click the "×" button that appears in the top-right corner

## API Endpoints

### Tasks (Optimal Schedule)
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/<id>` - Update a task
- `DELETE /api/tasks/<id>` - Delete a task

### Schedule Entries (Daily Schedule)
- `GET /api/schedule` - Get today's schedule
- `POST /api/schedule` - Create a schedule entry
- `PUT /api/schedule/<id>` - Update a schedule entry
- `DELETE /api/schedule/<id>` - Delete a schedule entry
- `POST /api/schedule/sync` - Sync from optimal schedule

### Location & Prayer Times
- `GET /api/sunset?lat={latitude}&lng={longitude}` - Get sunset, sunrise, and Islamic prayer times (Dhuhr, Asr, Isha) for coordinates

## Project Structure

```
Scheduler/
├── app.py                    # Flask application and API routes
├── models.py                 # SQLAlchemy models (Task, ScheduleEntry)
├── database.py              # Database initialization
├── requirements.txt         # Python dependencies
├── static/
│   ├── css/style.css       # Styling and layout
│   └── js/
│       ├── api.js          # API client
│       ├── location.js     # Geolocation & sunset management
│       ├── schedule.js     # Main application logic
│       └── dragdrop.js     # Drag & drop functionality
├── templates/
│   └── index.html          # Main HTML template
└── data/
    └── scheduler.db        # SQLite database (auto-generated)
```

## Technologies

- **Backend**: Flask, SQLAlchemy, Flask-CORS
- **Frontend**: Vanilla JavaScript, HTML5 Drag & Drop API, CSS3
- **Database**: SQLite

## Notes

- Port 5001 is used in development instead of 5000 to avoid conflicts with macOS AirPlay
- Time slots snap to 15-minute intervals for easier scheduling
- Tasks are color-coded automatically from a predefined palette
- The application uses a single-page architecture for smooth interactions
- Timeline starts at sunset time (Maghrib prayer) calculated daily based on your location
- Prayer times are marked with color-coded lines and labels on the timeline
- All prayer times are cached in localStorage and refreshed once per day
- Uses the sunrise-sunset.org API for sun calculations
- Uses the Aladhan API for Islamic prayer time calculations (ISNA method)
- If location access is denied, default prayer times are used
