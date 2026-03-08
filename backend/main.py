from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import os
import numpy as np

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    username: str
    password: str

CSV_FILE_PATH = os.path.join(os.path.dirname(__file__), "Sales Profit Report - By Product Group 2024.csv")

@app.get("/")
def read_root():
    return {"message": "MPT OmniPortal Backend is running"}

@app.post("/api/login")
def login(request: LoginRequest):
    valid_users = ["shadowblade", "rooben"]
    if request.username.lower() in valid_users:
        return {
            "message": "Login successful",
            "user": {
                "username": request.username.lower(),
                "role": "admin"
            }
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/summary")
def get_summary():
    try:
        if not os.path.exists(CSV_FILE_PATH):
            return {"error": "CSV file not found", "path": CSV_FILE_PATH}

        df = pd.read_csv(CSV_FILE_PATH)
        
        # Ensure numeric columns are actually numeric
        df['trx_amt'] = pd.to_numeric(df['trx_amt'], errors='coerce').fillna(0)
        df['cost_amt'] = pd.to_numeric(df['cost_amt'], errors='coerce').fillna(0)
        
        # Parse dates
        df['trx_date'] = pd.to_datetime(df['trx_date'], errors='coerce')
        df['month_key'] = df['trx_date'].dt.strftime('%Y-%m')
        df['day_of_week'] = df['trx_date'].dt.day_name()
        
        # Fill NaNs in string columns
        df['saleman_cd'] = df['saleman_cd'].fillna('Unknown')
        df['inv_desc'] = df['inv_desc'].fillna('Unknown')
        df['com_unit'] = df['com_unit'].fillna('Unknown')
        
        total_network_revenue = float(df['trx_amt'].sum())
        total_investment = float(df['cost_amt'].sum())
        
        # Group by outlet (com_unit)
        outlets = []
        for outlet_code, outlet_df in df.groupby('com_unit'):
            # Salesmen map
            salesmen = outlet_df.groupby('saleman_cd')['trx_amt'].sum().to_dict()
            
            # Brands map
            brands = outlet_df.groupby('inv_desc')['trx_amt'].sum().to_dict()
            
            # Salesman Profiles
            salesman_profiles = {}
            for sm_name, sm_df in outlet_df.groupby('saleman_cd'):
                
                # Daily Revenue
                daily_rev = sm_df.groupby('day_of_week')['trx_amt'].sum().to_dict()
                
                # Monthly Data
                monthly_data = {}
                for month, month_df in sm_df.groupby('month_key'):
                    monthly_data[month] = {
                        "revenue": float(month_df['trx_amt'].sum()),
                        "brands": month_df.groupby('inv_desc')['trx_amt'].sum().to_dict()
                    }
                
                salesman_profiles[sm_name] = {
                    "id": sm_name,
                    "name": sm_name,
                    "totalRevenue": float(sm_df['trx_amt'].sum()),
                    "transactionCount": int(len(sm_df)),
                    "dailyRevenue": daily_rev,
                    "brands": sm_df.groupby('inv_desc')['trx_amt'].sum().to_dict(),
                    "monthlyData": monthly_data
                }

            outlets.append({
                "code": str(outlet_code).strip(),
                "name": str(outlet_code).strip(),
                "totalRevenue": float(outlet_df['trx_amt'].sum()),
                "totalInvestment": float(outlet_df['cost_amt'].sum()),
                "transactionCount": int(len(outlet_df)),
                "salesmen": salesmen,
                "brands": brands,
                "salesmanProfiles": salesman_profiles
            })
            
        # Sort outlets by revenue descending
        outlets.sort(key=lambda x: x['totalRevenue'], reverse=True)

        return {
            "message": "Data successfully processed via Python Pandas",
            "totalNetworkRevenue": total_network_revenue,
            "totalInvestment": total_investment,
            "outlets": outlets
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
