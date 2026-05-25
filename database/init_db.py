import os
import sys


PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from database import db


if __name__ == '__main__':
    db.init_db()
    print(f"Database initialized at: {db.DB_FILE}")