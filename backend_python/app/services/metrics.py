def calculate_metrics(logs: list):
    """
    Calculate high-level metrics from a list of logs or AI results.
    """
    total = len(logs)
    if total == 0:
        return {
            "systemHealth": 100.0,
            "errorRate": 0.0,
            "errorDistribution": {"error": 0, "warning": 0, "info": 0},
            "totalRequests": 0,
            "errorCount": 0,
            "successCount": 0
        }
        
    error_count = 0
    warning_count = 0
    info_count = 0
    
    for l in logs:
        # Check either raw log text or the AI analysis dict
        is_err = False
        is_warn = False
        
        if isinstance(l, dict):
            # If it's the AI result dictionary
            type_val = str(l.get("type", "")).lower()
            sev_val = str(l.get("severity", "")).lower()
            if "error" in type_val or sev_val == "high":
                is_err = True
            elif "warning" in type_val or sev_val == "medium":
                is_warn = True
        else:
            # If it's a raw string
            text = str(l).lower()
            if "error" in text:
                is_err = True
            elif "warning" in text:
                is_warn = True
                
        if is_err:
            error_count += 1
        elif is_warn:
            warning_count += 1
        else:
            info_count += 1

    success_count = total - error_count
    
    system_health = ((total - error_count) / total) * 100
    error_rate = (error_count / total) * 100
    
    return {
        "systemHealth": round(system_health, 2),
        "errorRate": round(error_rate, 2),
        "errorDistribution": {
            "error": error_count,
            "warning": warning_count,
            "info": info_count
        },
        "totalRequests": total,
        "errorCount": error_count,
        "successCount": success_count
    }
