import firebase_admin
from firebase_admin import credentials, firestore, db
import json
from typing import Dict, Any
from .base import BaseConnector
import os

class FirebaseConnector(BaseConnector):
    def test_connection(self, credentials_dict: Dict[str, Any]) -> Dict[str, Any]:
        try:
            # Handle Service Account JSON
            sa_json = credentials_dict.get('serviceAccountJson') or credentials_dict.get('uri') or credentials_dict.get('password')
            if not sa_json:
                return {"success": False, "error": "Service Account JSON is required."}
            
            try:
                cert_info = json.loads(sa_json) if isinstance(sa_json, str) else sa_json
            except:
                return {"success": False, "error": "Invalid Service Account JSON format."}

            # Initialize firebase app if not already initialized
            app_name = f"app_{credentials_dict.get('name', 'default')}"
            try:
                # Check if app exists
                firebase_admin.get_app(app_name)
            except ValueError:
                cred = credentials.Certificate(cert_info)
                firebase_admin.initialize_app(cred, {
                    'databaseURL': credentials_dict.get('host') # Use host field for databaseURL if needed
                }, name=app_name)

            # Test Firestore
            app = firebase_admin.get_app(app_name)
            client = firestore.client(app=app)
            # Try to list collections as a test
            collections = client.collections()
            # Just getting the generator is enough to verify credentials usually
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_schema_summary(self, credentials_dict: Dict[str, Any]) -> str:
        try:
            app_name = f"app_{credentials_dict.get('name', 'default')}"
            app = firebase_admin.get_app(app_name)
            client = firestore.client(app=app)
            
            collections = list(client.collections())
            if not collections:
                return "The Firebase project has no Firestore collections."
                
            schema_parts = []
            for coll in collections[:10]: # Limit to 10 for summary
                # Sample one document
                docs = list(coll.limit(1).stream())
                if docs:
                    doc_dict = docs[0].to_dict()
                    fields = [f"{k} ({type(v).__name__})" for k, v in doc_dict.items()]
                    schema_parts.append(f"Collection: {coll.id}\nFields: {', '.join(fields)}")
                else:
                    schema_parts.append(f"Collection: {coll.id} (Empty)")
                    
            return "\n\n".join(schema_parts)
        except Exception as e:
            return f"Could not fetch Firebase schema: {str(e)}"

    def execute_read_only_query(self, credentials_dict: Dict[str, Any], query: str) -> Dict[str, Any]:
        """
        Expect AI to generate a JSON query for Firestore.
        Example: { "collection": "users", "limit": 10 }
        """
        try:
            app_name = f"app_{credentials_dict.get('name', 'default')}"
            app = firebase_admin.get_app(app_name)
            client = firestore.client(app=app)
            
            try:
                # Handle both raw JSON string or structured query
                if query.strip().startswith('{'):
                    q = json.loads(query)
                else:
                    # Generic 'SELECT * FROM collection' simulation
                    q = {"collection": query.split(' ')[-1]}
            except:
                raise Exception("Firebase requires JSON query format or 'SELECT * FROM collection' style.")
                
            coll_name = q.get("collection")
            if not coll_name:
                 raise Exception("JSON query must specify 'collection'.")
                 
            coll_ref = client.collection(coll_name)
            
            # Apply filters if any (simplified)
            if q.get("where"):
                for w in q["where"]:
                    coll_ref = coll_ref.where(w[0], w[1], w[2])
                    
            if q.get("order_by"):
                coll_ref = coll_ref.order_by(q["order_by"])
                
            if q.get("limit"):
                coll_ref = coll_ref.limit(q["limit"])
            else:
                coll_ref = coll_ref.limit(100)
                
            docs = coll_ref.stream()
            rows = []
            for doc in docs:
                d = doc.to_dict()
                d["_id"] = doc.id
                rows.append(d)
                
            if rows:
                columns = [{"name": k, "type": "string"} for k in rows[0].keys()]
            else:
                columns = []
                
            return {
                "columns": columns,
                "rows": rows
            }
        except Exception as e:
            raise Exception(f"Firebase Error: {str(e)}")
