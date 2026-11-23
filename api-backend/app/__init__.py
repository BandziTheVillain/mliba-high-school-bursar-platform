from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import text

from app.config import Config, base_dir, static_folder
from app.seed import create_superuser

APP_TITLE = "School Fees Payment Tracker"
APP_VERSION = "1.0.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_superuser()
    yield


app = FastAPI(lifespan=lifespan, title=APP_TITLE, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .db import engine  # noqa: E402
from .router import router  # noqa: E402

app.mount("/static", StaticFiles(directory=static_folder), "static")

# Absolute path so it works no matter which directory the server is started from
templates = Jinja2Templates(directory=base_dir / "templates")

app.include_router(prefix="/api", router=router)

STARTED_AT = datetime.now(timezone.utc)


def _database_ok() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


HTTP_METHODS = ("get", "post", "put", "patch", "delete")


def _api_endpoints() -> list[dict]:
    """Group the /api routes by resource (tasks, students, auth...) for the index page.

    Built from the OpenAPI schema rather than app.routes: newer FastAPI versions keep
    included routers behind a lazy wrapper, while the schema is a stable public API.
    Endpoints that depend on the OAuth2 scheme carry a `security` entry there.
    """
    groups: dict[str, list[dict]] = defaultdict(list)
    for path, operations in app.openapi().get("paths", {}).items():
        if not path.startswith("/api/"):
            continue
        resource = path.split("/")[2]
        for method in HTTP_METHODS:
            op = operations.get(method)
            if op is None:
                continue
            groups[resource].append({
                "method": method.upper(),
                "path": path,
                "summary": op.get("summary", ""),
                "protected": bool(op.get("security")),
            })
    order = {"auth": 0}
    return [
        {"name": name, "routes": sorted(routes, key=lambda r: (r["path"], r["method"]))}
        for name, routes in sorted(groups.items(), key=lambda g: (order.get(g[0], 1), g[0]))
    ]


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def index_page(request: Request):
    groups = _api_endpoints()
    return templates.TemplateResponse(request, "index.html", {
        "title": APP_TITLE,
        "version": APP_VERSION,
        "db_ok": _database_ok(),
        "started_at": STARTED_AT,
        "groups": groups,
        "endpoint_count": sum(len(g["routes"]) for g in groups),
        "frontend_url": Config.FRONTEND_URL,
    })


@app.get("/health", tags=["health"])
def health_check():
    db_ok = _database_ok()
    return JSONResponse(
        status_code=200 if db_ok else 503,
        content={"status": "ok" if db_ok else "degraded", "database": "up" if db_ok else "down"},
    )
