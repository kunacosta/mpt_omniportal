from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import os

app = FastAPI()

# Enable CORS so the mobile app can access the data
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. FIXED PASSWORDS DEFINITION
USERS_DB = {
    "shadowblade": "mpt_admin_2024",
    "rooben": "mpt_staff_2024"
}

class LoginRequest(BaseModel):
    username: str
    password: str

# Use absolute path to ensure the file is found regardless of where uvicorn starts
CSV_FILE_PATH = os.path.join(os.path.dirname(__file__), "Sales Profit Report - By Product Group 2024.csv")

@app.get("/")
def read_root():
    return {"message": "MPT OmniPortal Backend is running"}

@app.post("/api/login")
def login(request: LoginRequest):
    user = request.username.lower()
    # 2. VALIDATE AGAINST FIXED PASSWORDS
    if user in USERS_DB and USERS_DB[user] == request.password:
        return {
            "message": "Login successful",
            "user": {
                "username": user,
                "role": "admin" if user == "shadowblade" else "manager"
            }
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid username or password")

@app.get("/api/summary")
def get_summary():
    try:
        if not os.path.exists(CSV_FILE_PATH):
            return {"error": "CSV file not found"}

        # Read and clean data
        df = pd.read_csv(CSV_FILE_PATH)
        df['trx_amt'] = pd.to_numeric(df['trx_amt'], errors='coerce').fillna(0)
        df['cost_amt'] = pd.to_numeric(df['cost_amt'], errors='coerce').fillna(0)
        
        outlets = []
        # Grouping by 'com_unit' to match your 'OutletSummary' interface
        for outlet_code, outlet_df in df.groupby('com_unit'):
            # Convert GroupBy objects to standard dictionaries for JSON
            salesmen = outlet_df.groupby('saleman_cd')['trx_amt'].sum().to_dict()
            brands = outlet_df.groupby('inv_desc')['trx_amt'].sum().to_dict()

            outlets.append({
                "code": str(outlet_code).strip(),
                "name": f"Branch {outlet_code}",
                "totalRevenue": float(outlet_df['trx_amt'].sum()),
                "totalInvestment": float(outlet_df['cost_amt'].sum()),
                "transactionCount": int(len(outlet_df)),
                "salesmen": {str(k): float(v) for k, v in salesmen.items()},
                "brands": {str(k): float(v) for k, v in brands.items()},
                "salesmanProfiles": {} # Initialized empty as per your interface
            })
            
        outlets.sort(key=lambda x: x['totalRevenue'], reverse=True)

        return {
            "message": "Data successfully processed",
            "outlets": outlets
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    # 0.0.0.0 tells the server to listen on all available network interfaces
    uvicorn.run(app, host="0.0.0.0", port=8000)