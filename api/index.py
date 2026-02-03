import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app

# This is the WSGI entry point for Vercel
# Vercel's Python runtime automatically detects and uses the 'app' variable
# The vercel.json routes all requests to this handler
