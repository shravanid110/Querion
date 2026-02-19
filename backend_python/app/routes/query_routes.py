from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.models import get_db, Connection
from app.services.encryption import decrypt
from app.services.mysql_executor import MySQLService
from app.services.nl_to_sql import convert_nl_to_sql

router = APIRouter()

@router.post("/run")
async def run_query(connectionId: str = Body(...), prompt: str = Body(...), db: Session = Depends(get_db)):
    print(f"[Query Route] Received request for connectionId: {connectionId}, prompt: \"{prompt}\"")
    try:
        # 1. Fetch credentials
        connection = db.query(Connection).filter(Connection.id == connectionId).first()
        if not connection:
            raise HTTPException(status_code=404, detail="Connection not found")

        password = decrypt(connection.password)
        connection_params = {
            "host": connection.host,
            "port": connection.port,
            "database": connection.database,
            "user": connection.username,
            "password": password
        }

        # 2. Fetch Schema context
        schema = MySQLService.get_schema_summary(connection_params)
        print(f"Schema fetched for connection {connectionId}. Length: {len(schema)} chars.")

        if not schema or "Could not fetch schema" in schema or "The database is empty" in schema:
            print(f"Empty or invalid schema for connection: {connectionId}")

        # 3. Convert NL to SQL
        result = await convert_nl_to_sql(schema, prompt)

        if not result.get("sql"):
            raise HTTPException(
                status_code=422, 
                detail={
                    "error": result.get("explanation", "Could not generate SQL for this prompt."),
                    "explanation": result.get("explanation")
                }
            )

        # 4. Execute SQL
        data = MySQLService.execute_read_only_query(connection_params, result["sql"])

        # 5. Calculate basic metrics
        rows = data["rows"]
        total_rows = len(rows)
        numeric_sum = 0
        
        if total_rows > 0:
            first_row = rows[0]
            # Detect numeric fields
            number_fields = [k for k, v in first_row.items() if isinstance(v, (int, float))]
            if number_fields:
                field = number_fields[0]
                numeric_sum = sum(float(row.get(field) or 0) for row in rows)

        return {
            "sql": result["sql"],
            "explanation": result.get("explanation"),
            "columns": data["columns"],
            "rows": rows,
            "metrics": {
                "totalRows": total_rows,
                "approxSum": numeric_sum
            }
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Query Handler Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
