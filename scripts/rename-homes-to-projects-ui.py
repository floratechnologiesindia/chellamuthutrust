#!/usr/bin/env python3
"""UI-only: rename user-facing Home(s) strings and routes to Project(s)."""
from pathlib import Path

REPLACEMENTS = [
    ("/super-admin/homes", "/super-admin/projects"),
    ("/admin/homes", "/admin/projects"),
    ("/warden/home", "/warden/project"),
    ("`/homes/${", "`/projects/${"),
    ('to="/homes"', 'to="/projects"'),
    ('Link to="/homes"', 'Link to="/projects"'),
    ("'Unknown Home'", "'Unknown Project'"),
    ("'All Homes'", "'All Projects'"),
    ("'Care Home'", "'Project'"),
    ("Browse All Homes", "Browse All Projects"),
    ("Back to Homes", "Back to Projects"),
    ("Manage Homes", "Manage Projects"),
    ("Total Homes", "Total Projects"),
    ("Add Home", "Add Project"),
    ("Edit Home", "Edit Project"),
    ("Delete Home", "Delete Project"),
    ("Home Management", "Project Management"),
    ("Support This Home", "Support This Project"),
    ("Explore Homes", "Explore Projects"),
    ("Our Care Homes", "Our Projects"),
    ("View All Homes", "View All Projects"),
    ("Filter by Home", "Filter by Project"),
    ("Assign to Home", "Assign to Project"),
    ("Home Selection", "Project Selection"),
    ("Home Name *", "Project Name *"),
    ("Home Name", "Project Name"),
    ("Home Type", "Project Type"),
    ("Unit/Home", "Unit/Project"),
    ("Homes Overview", "Projects Overview"),
    ("Needs by Home", "Needs by Project"),
    ("Home Profile", "Project Profile"),
    ("Home not found", "Project not found"),
    ("Home Not Found", "Project Not Found"),
    ("Not Assigned to Any Home", "Not Assigned to Any Project"),
    ("Manage all care homes", "Manage all projects on the platform"),
    ("Add, edit, or view care homes", "Add, edit, or view projects"),
    ("Search homes...", "Search projects..."),
    ("No homes found", "No projects found"),
    ("Select a home", "Select a project"),
    ("creating or editing a home", "creating or editing a project"),
    ("assigned to this home", "assigned to this project"),
    ("save the home", "save the project"),
    ("daily home operations", "daily project operations"),
    ("Your Home", "Your Project"),
    ("All Homes (", "All Projects ("),
    (">Homes<", ">Projects<"),
    ('placeholder="Home type"', 'placeholder="Project type"'),
    ("Add New Home", "Add New Project"),
    ("Update home information", "Update project information"),
    ("Create a new care home", "Create a new project"),
    ("Enter home name", "Enter project name"),
    ("Home name, type", "Project name, type"),
    ("The care home you", "The project you"),
    ("verified care homes across", "verified projects across"),
    ("from our care homes", "from our projects"),
    ("Discover care homes", "Discover projects"),
    ("manage homes, needs", "manage projects, needs"),
    ("homes, staff", "projects, staff"),
    ("Home-level access", "Project-level access"),
    ("assigned home", "assigned project"),
    ("Trust & Home Assignment", "Trust & Project Assignment"),
    ("Home Types", "Project Types"),
    ("Add Home Type", "Add Project Type"),
    ("Edit Home Type", "Edit Project Type"),
    ("across homes", "across projects"),
    ('placeholder="Select Home"', 'placeholder="Select Project"'),
    ('placeholder="Home"', 'placeholder="Project"'),
    (">Home<", ">Project<"),
    ("Featured Homes", "Featured Projects"),
    ("Care Homes", "Projects"),
    ("} Homes", "} Projects"),
    ("Need distribution across homes", "Need distribution across projects"),
    ("Manage categories, home types", "Manage categories, project types"),
    ("Home type updated", "Project type updated"),
    ("Home type created", "Project type created"),
    ("save home type", "save project type"),
    ("update home type", "update project type"),
    ("delete home type", "delete project type"),
    ("No home types found", "No project types found"),
    ("for assigned home", "for assigned project"),
    ("between generous donors and verified care homes", "between generous donors and verified projects"),
    ("work with multiple care homes", "work with multiple projects"),
    ("open needs from verified care homes", "open needs from verified projects"),
    ("All Homes</SelectItem>", "All Projects</SelectItem>"),
    ("Trust & Home (Optional)", "Trust & Project (Optional)"),
    ("{/* Homes Table */}", "{/* Projects Table */}"),
    ("{/* Home Types Management Section */}", "{/* Project Types Management Section */}"),
    ("{/* Home Type Dialog */}", "{/* Project Type Dialog */}"),
    ("{/* Home Info */}", "{/* Project Info */}"),
    ("{/* Home selector */}", "{/* Project selector */}"),
    ("{/* Home filter */}", "{/* Project filter */}"),
    ("{/* Home Selection */}", "{/* Project Selection */}"),
    ("{/* Featured Homes */}", "{/* Featured Projects */}"),
]

SKIP_IF_CONTAINS = [
    "Back to Home'",  # homepage CTA — do not change
    'Back to Home"',
]

root = Path(__file__).resolve().parents[1] / "src"
changed = 0
for path in sorted(root.rglob("*")):
    if path.suffix not in {".ts", ".tsx"}:
        continue
    text = path.read_text(encoding="utf-8")
    original = text
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    if text != original:
        path.write_text(text, encoding="utf-8")
        changed += 1

print(f"Updated {changed} files.")
