from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from app.models import get_db, Connection, QueryHistory
from app.services.encryption import decrypt
from app.services.mysql_executor import MySQLService
from app.services.nl_to_sql import convert_nl_to_sql, generate_data_insights
import json

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
            # Point 7: Provide a friendly, informative explanation instead of failing.
            return {
                "sql": None,
                "explanation": result.get("explanation", "I couldn't process this request. Could you try rephrasing?"),
                "columns": [],
                "rows": [],
                "metrics": {"totalRows": 0, "approxSum": 0}
            }

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

        # 6. Generate Real-time Data Insights (Rule 3)
        rich_explanation = result.get("explanation", "")
        
        # If we have data, let's get deep insights
        if total_rows > 0 and result.get("sql"):
            try:
                print(f"[Query Route] Generating deep data insights for {total_rows} rows...")
                data_insights = await generate_data_insights(prompt, result["sql"], rows, schema)
                
                # Merge the initial explanation (which has Reason/Available Data) with the data insights
                # We extract the first part of the explanation if it has the headers
                explanation_parts = rich_explanation.split("📊 Data Visualization & Insights:")
                header_part = explanation_parts[0] if explanation_parts else rich_explanation
                
                rich_explanation = f"{header_part.strip()}\n\n{data_insights.strip()}"
            except Exception as e:
                print(f"[Query Route] Insights generation failed: {e}")

        # 7. Save to History
        try:
            history_record = QueryHistory(
                user_id=connection.user_id or "default_user",
                conn_id=connection.id,
                conn_name=connection.name,
                prompt=prompt,
                sql_query=result["sql"],
                explanation=rich_explanation,
                columns=json.dumps(jsonable_encoder(data["columns"])),
                rows_data=json.dumps(jsonable_encoder(rows[:100])), # Save top 100 rows safely
                metrics=json.dumps({"totalRows": total_rows, "approxSum": numeric_sum})
            )
            db.add(history_record)
            db.commit()
            print(f"[Query Route] Saved query to history for {connection.name}")
        except Exception as e:
            print(f"[Query Route] Failed to save history: {e}")
            db.rollback()

        return {
            "sql": result["sql"],
            "explanation": rich_explanation,
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
